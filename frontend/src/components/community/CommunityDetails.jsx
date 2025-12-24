import React, { useMemo, useState, useEffect } from 'react';
import './CommunityDetails.css';
import { deleteCommunity, updateCommunity, getCommunityById, submitCommunityInput, getCommunityInputs, updateCommunityInput, deleteCommunityInput, getCommunityInputsCount, getUserByUsername, getUsersByName, getCitiesByCountry } from '../../services/api';
import { COUNTRIES } from '../../constants/countries';


const formatDate = (isoString) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString || '-';
  }
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const getSortIndicator = (activeColumn, column, direction) => {
  if (activeColumn !== column) return '';
  return direction === 'asc' ? '↑' : '↓';
};

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const CommunityDetails = ({ community, currentUser, onDeleteSuccess, onCommunityUpdated, onSelectUser, onNavigateToUpdate }) => {
  const communityTabs = useMemo(() => {
    if (community?.tabs && Array.isArray(community.tabs)) {
      console.log('Using tabs from API:', community.tabs);
      return community.tabs;
    }
    if (community?.tabs_config && Array.isArray(community.tabs_config)) {
      console.log('Using tabs_config from API:', community.tabs_config);
      return community.tabs_config;
    }
    // Only use mock data if community exists but has no tabs property at all
    console.log('No tabs found in community, using mock data');
    return [];
  }, [community?.tabs, community?.tabs_config]);

  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (communityTabs.length > 0) {
      return communityTabs[0].id;
    }
    return null;
  });
  const [inputs, setInputs] = useState([]);
  const [isLoadingInputs, setIsLoadingInputs] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    column: 'createdAt',
    direction: 'desc',
  });
  const [showAddInputDialog, setShowAddInputDialog] = useState(false);
  const [dialogFormState, setDialogFormState] = useState({});
  const [editingInput, setEditingInput] = useState(null); // Store the input being edited
  // Location input state
  const [locationData, setLocationData] = useState({}); // { inputId: { country: '', city: '', address: '' } }
  const [citiesData, setCitiesData] = useState({}); // { country: ['city1', 'city2', ...] }
  const [loadingCities, setLoadingCities] = useState({}); // { country: true/false }
  const [detailsItem, setDetailsItem] = useState(null);
  const [inputSearchQuery, setInputSearchQuery] = useState('');
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [activeFilters, setActiveFilters] = useState({}); // { inputId: { type: 'dropdown', values: [...] } }
  const [filterFormState, setFilterFormState] = useState({}); // { inputId: { value: ... } }
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [updateForm, setUpdateForm] = useState({
    title: '',
    description: ''
  });
  const [isSubmittingInput, setIsSubmittingInput] = useState(false);
  const [submitInputError, setSubmitInputError] = useState(null);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState(null);
  const [showDeleteInputDialog, setShowDeleteInputDialog] = useState(false);
  const [inputToDelete, setInputToDelete] = useState(null);
  const [isDeletingInput, setIsDeletingInput] = useState(false);
  const [deleteInputError, setDeleteInputError] = useState(null);

  const title = community?.title || 'Community Title';
  const description = community?.description || 'No description provided.';
  const communityOwner = community?.creator || community?.creator_name || 'Unknown';
  const createdAt = formatDate(
    community?.createdAt || community?.created_at || new Date().toISOString(),
  );
  const [inputCount, setInputCount] = useState(0);
  
  // Check if current user is the creator or admin
  const isAdmin = currentUser && currentUser.username === 'admin';
  const isCreator = currentUser && community && (currentUser.id === community.creator_id || currentUser.id === community.creatorId);
  const hasAdminPrivileges = isCreator || isAdmin;
  
  // Get creator info from community
  const creatorEmail = community?.creator_email || null;
  const creatorUsername = community?.creator_username || null;

  const handleSort = (column) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        return {
          column,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      const defaultDirection = column === 'createdAt' ? 'desc' : 'asc';
      return { column, direction: defaultDirection };
    });
  };

  const sortedAndFilteredInputs = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }
    let filtered = inputs.filter((input) => {
      const inputCategory = input.category;
      return inputCategory === selectedCategory || 
             String(inputCategory) === String(selectedCategory);
    });

    // Sort the filtered results
    const sorted = [...filtered].sort((a, b) => {
      if (sortConfig.column === 'createdAt') {
        const first = new Date(a.createdAt).getTime();
        const second = new Date(b.createdAt).getTime();
        return sortConfig.direction === 'asc'
          ? first - second
          : second - first;
      }
      if (sortConfig.column === 'creator') {
        const first = (a.creator || '').toLowerCase();
        const second = (b.creator || '').toLowerCase();
        if (first === second) return 0;
        if (sortConfig.direction === 'asc') {
          return first > second ? 1 : -1;
        }
        return first < second ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [inputs, sortConfig, selectedCategory]);

  // Get unique values from existing inputs for filter options
  const getUniqueValuesForInput = (inputTitle) => {
    const values = new Set();
    sortedAndFilteredInputs.forEach(input => {
      if (input.inputs) {
        input.inputs.forEach(field => {
          if (field.inputTitle === inputTitle) {
            if (field.items && field.items.length > 0) {
              field.items.forEach(item => {
                const itemValue = typeof item === 'string' ? item : (item.value || '');
                if (itemValue) values.add(itemValue);
              });
            } else if (field.value) {
              values.add(field.value);
            }
          }
        });
      }
    });
    return Array.from(values).sort();
  };

  // Get unique countries and cities from location inputs
  const getUniqueLocations = () => {
    const countries = new Set();
    const citiesByCountry = {};
    
    sortedAndFilteredInputs.forEach(input => {
      if (input.inputs) {
        input.inputs.forEach(field => {
          if (field.inputType === 'location' && field.value) {
            try {
              const location = JSON.parse(field.value);
              if (location.country) {
                countries.add(location.country);
                if (!citiesByCountry[location.country]) {
                  citiesByCountry[location.country] = new Set();
                }
                if (location.city) {
                  citiesByCountry[location.country].add(location.city);
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        });
      }
    });
    
    const cities = {};
    Object.keys(citiesByCountry).forEach(country => {
      cities[country] = Array.from(citiesByCountry[country]).sort();
    });
    
    return {
      countries: Array.from(countries).sort(),
      cities
    };
  };

  // Apply advanced filters
  const applyAdvancedFilters = (inputs) => {
    if (Object.keys(activeFilters).length === 0) {
      return inputs;
    }

    return inputs.filter(input => {
      if (!input.inputs) return true;
      
      // Check each input field against its filter
      return input.inputs.every(field => {
        const filter = activeFilters[field.inputTitle];
        if (!filter) return true; // No filter for this field, include it
        
        if (filter.type === 'dropdown' || filter.type === 'multiselect') {
          // Check if field value matches any selected filter value
          const fieldValues = field.items?.map(item => {
            return typeof item === 'string' ? item : (item.value || '');
          }) || [field.value].filter(Boolean);
          
          return fieldValues.some(val => filter.values.includes(val));
        } else if (filter.type === 'free text') {
          // Text search
          const searchText = filter.value.toLowerCase();
          const fieldValue = (field.value || '').toLowerCase();
          const itemsText = field.items?.map(item => {
            const itemValue = typeof item === 'string' ? item : (item.value || '');
            return itemValue.toLowerCase();
          }).join(' ') || '';
          
          return fieldValue.includes(searchText) || itemsText.includes(searchText);
        } else if (filter.type === 'date') {
          // Filter dates earlier than selected date
          if (!filter.value) return true;
          const filterDate = new Date(filter.value);
          const fieldDate = new Date(field.value || field.items?.[0]?.value || '');
          
          if (isNaN(fieldDate.getTime())) return true;
          return fieldDate < filterDate;
        } else if (filter.type === 'location') {
          // Location filter
          if (!field.value) return !filter.country && !filter.city;
          
          try {
            const location = JSON.parse(field.value);
            if (filter.country && location.country !== filter.country) {
              return false;
            }
            if (filter.city && location.city !== filter.city) {
              return false;
            }
            return true;
          } catch (e) {
            return true;
          }
        }
        
        return true;
      });
    });
  };

  // Filter inputs based on search query and advanced filters
  const filteredAndSortedInputs = useMemo(() => {
    let filtered = sortedAndFilteredInputs;
    
    // Apply advanced filters first
    filtered = applyAdvancedFilters(filtered);
    
    // Then apply search query
    if (inputSearchQuery.trim()) {
      const query = inputSearchQuery.toLowerCase().trim();
      
      filtered = filtered.filter(input => {
        // Search in creator name
        const creatorMatch = (input.creator || '').toLowerCase().includes(query);
        
        // Search in all input values
        const inputValuesMatch = input.inputs?.some(inputField => {
          // Check the main value
          const valueMatch = (inputField.value || '').toLowerCase().includes(query);
          
          // Check items (for multiselect, dropdown, etc.)
          const itemsMatch = inputField.items?.some(item => {
            const itemValue = typeof item === 'string' ? item : (item.value || '');
            return itemValue.toLowerCase().includes(query);
          });
          
          // For location type, parse JSON and search
          if (inputField.inputType === 'location') {
            try {
              const location = JSON.parse(inputField.value || '{}');
              const countryMatch = (location.country || '').toLowerCase().includes(query);
              const cityMatch = (location.city || '').toLowerCase().includes(query);
              const addressMatch = (location.address || '').toLowerCase().includes(query);
              return countryMatch || cityMatch || addressMatch;
            } catch (e) {
              // If parsing fails, just search the raw value
              return (inputField.value || '').toLowerCase().includes(query);
            }
          }
          
          return valueMatch || itemsMatch;
        });
        
        return creatorMatch || inputValuesMatch;
      });
    }
    
    return filtered;
  }, [sortedAndFilteredInputs, inputSearchQuery, activeFilters]);

  // Fetch cities for a country
  const fetchCitiesForCountry = async (country) => {
    if (!country || citiesData[country]) {
      return; // Already loaded or invalid country
    }
    
    setLoadingCities(prev => ({ ...prev, [country]: true }));
    try {
      const response = await getCitiesByCountry(country);
      if (response.data && Array.isArray(response.data)) {
        setCitiesData(prev => ({
          ...prev,
          [country]: response.data
        }));
      }
    } catch (error) {
      console.error(`Error fetching cities for ${country}:`, error);
      setCitiesData(prev => ({
        ...prev,
        [country]: []
      }));
    } finally {
      setLoadingCities(prev => ({ ...prev, [country]: false }));
    }
  };

  // Initialize dialog form state when dialog opens
  const initializeDialogForm = (inputToEdit = null) => {
    if (!selectedTab) {
      console.warn('No selected tab when trying to initialize dialog');
      return;
    }
    const tabInputs = selectedTab?.tab_form_structure?.tab_inputs || [];
    console.log('Initializing dialog form with tab:', selectedTab);
    console.log('Tab form structure:', selectedTab?.tab_form_structure);
    console.log('Tab inputs:', tabInputs);
    console.log('Editing input:', inputToEdit);
    
    const initialState = {};
    
    if (inputToEdit && inputToEdit.inputs) {
      tabInputs.forEach((input) => {
        const existingInput = inputToEdit.inputs.find(inp => inp.inputTitle === input.input_title);
        if (existingInput) {
          if (input.input_type === 'multiselect') {
            initialState[input.input_id] = existingInput.items?.map(item => item.value || item) || [];
          } else if (input.input_type === 'dropdown') {
            initialState[input.input_id] = existingInput.items?.[0]?.value || existingInput.value || '';
          } else if (input.input_type === 'date') {
            // For date type, extract date string (YYYY-MM-DD format)
            const dateValue = existingInput.value || existingInput.items?.[0]?.value || '';
            initialState[input.input_id] = dateValue ? String(dateValue).split('T')[0] : '';
          } else if (input.input_type === 'url') {
            initialState[input.input_id] = existingInput.value || existingInput.items?.[0]?.value || '';
          } else if (input.input_type === 'location') {
            // For location type, parse JSON string
            try {
              const locationValue = existingInput.value || existingInput.items?.[0]?.value || '';
              if (locationValue) {
                const location = JSON.parse(locationValue);
                setLocationData(prev => ({
                  ...prev,
                  [input.input_id]: {
                    country: location.country || '',
                    city: location.city || '',
                    address: location.address || ''
                  }
                }));
                // Fetch cities for the country if not already loaded
                if (location.country && !citiesData[location.country]) {
                  fetchCitiesForCountry(location.country);
                }
              } else {
                setLocationData(prev => ({
                  ...prev,
                  [input.input_id]: { country: '', city: '', address: '' }
                }));
              }
            } catch (e) {
              console.error('Error parsing location JSON:', e);
              setLocationData(prev => ({
                ...prev,
                [input.input_id]: { country: '', city: '', address: '' }
              }));
            }
            initialState[input.input_id] = ''; // We'll handle location separately
          } else {
            initialState[input.input_id] = existingInput.value || '';
          }
        } else {
          if (input.input_type === 'multiselect') {
            initialState[input.input_id] = [];
          } else {
            initialState[input.input_id] = '';
          }
        }
      });
    } else {
      tabInputs.forEach((input) => {
        if (input.input_type === 'multiselect') {
          initialState[input.input_id] = [];
        } else if (input.input_type === 'location') {
          setLocationData(prev => ({
            ...prev,
            [input.input_id]: { country: '', city: '', address: '' }
          }));
          initialState[input.input_id] = '';
        } else {
          initialState[input.input_id] = '';
        }
      });
    }
    
    setDialogFormState(initialState);
  };

  const handleOpenDialog = () => {
    if (!selectedTab) {
      console.warn('Cannot open dialog: no tab selected');
      return;
    }
    setEditingInput(null);
    setSubmitInputError(null);
    setSubmitSuccessMessage(null);
    initializeDialogForm();
    setShowAddInputDialog(true);
  };

  const handleEditInput = (input) => {
    if (!selectedTab) {
      console.warn('Cannot open dialog: no tab selected');
      return;
    }
    setEditingInput(input);
    setSubmitInputError(null);
    setSubmitSuccessMessage(null);
    initializeDialogForm(input);
    setShowAddInputDialog(true);
  };

  const handleCloseDialog = () => {
    setShowAddInputDialog(false);
    setDialogFormState({});
    setEditingInput(null);
    setSubmitInputError(null);
    // Reset location data when closing dialog
    setLocationData({});
  };

  const handleApplyFilters = () => {
    // Convert filterFormState to activeFilters
    const newFilters = {};
    const tabInputs = selectedTab?.tab_form_structure?.tab_inputs || [];
    
    tabInputs.forEach(input => {
      if (input.input_type === 'location') {
        // Handle location separately
        const locationFilter = filterFormState[`${input.input_id}_location`] || {};
        if (locationFilter && (locationFilter.country || locationFilter.city)) {
          newFilters[input.input_title] = {
            type: 'location',
            country: locationFilter.country || '',
            city: locationFilter.city || ''
          };
        }
      } else {
        const filterValue = filterFormState[input.input_id];
        if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) {
          return; // Skip empty filters
        }
        
        if (input.input_type === 'dropdown' || input.input_type === 'multiselect') {
          if (Array.isArray(filterValue) && filterValue.length > 0) {
            newFilters[input.input_title] = {
              type: input.input_type === 'dropdown' ? 'dropdown' : 'multiselect',
              values: filterValue
            };
          }
        } else if (input.input_type === 'free text' || input.input_type === 'freetext') {
          if (filterValue && filterValue.trim()) {
            newFilters[input.input_title] = {
              type: 'free text',
              value: filterValue.trim()
            };
          }
        } else if (input.input_type === 'date') {
          if (filterValue) {
            newFilters[input.input_title] = {
              type: 'date',
              value: filterValue
            };
          }
        }
      }
    });
    
    setActiveFilters(newFilters);
    setShowFilterDialog(false);
    setFilterFormState({});
  };

  const handleClearFilters = () => {
    setActiveFilters({});
    setFilterFormState({});
    // Don't close dialog if it's open, just clear filters
  };

  const handleAddFilter = (inputTitle, filterData) => {
    setActiveFilters(prev => ({
      ...prev,
      [inputTitle]: filterData
    }));
  };

  const handleRemoveFilter = (inputTitle) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[inputTitle];
      return newFilters;
    });
    // Also clear from form state
    const tabInputs = selectedTab?.tab_form_structure?.tab_inputs || [];
    const input = tabInputs.find(inp => inp.input_title === inputTitle);
    if (input) {
      setFilterFormState(prev => {
        const newState = { ...prev };
        delete newState[input.input_id];
        if (input.input_type === 'location') {
          delete newState[`${input.input_id}_location`];
        }
        return newState;
      });
    }
  };

  const handleAddInput = async () => {
    if (!selectedTab || !community?.id || !currentUser) {
      setSubmitInputError('Missing required information');
      return;
    }

    // Validate form
    const tabInputs = selectedTab?.tab_form_structure?.tab_inputs || [];
    const validationErrors = [];

    for (const input of tabInputs) {
      const value = dialogFormState[input.input_id];
      
      if (input.input_type === 'dropdown') {
        if (!value || value === '') {
          validationErrors.push(`${input.input_title} requires a selection`);
        }
      } else if (input.input_type === 'multiselect') {
        if (!value || !Array.isArray(value) || value.length === 0) {
          validationErrors.push(`${input.input_title} requires at least one selection`);
        }
      } else if (input.input_type === 'free text' || input.input_type === 'freetext') {
        if (!value || value.trim() === '') {
          validationErrors.push(`${input.input_title} cannot be empty`);
        }
      } else if (input.input_type === 'date') {
        if (!value || value.trim() === '') {
          validationErrors.push(`${input.input_title} requires a date selection`);
        }
      } else if (input.input_type === 'url') {
        if (!value || value.trim() === '') {
          validationErrors.push(`${input.input_title} requires a URL`);
        }
      } else if (input.input_type === 'location') {
        const location = locationData[input.input_id] || { country: '', city: '', address: '' };
        if (!location.country || location.country.trim() === '') {
          validationErrors.push(`${input.input_title} requires a country selection`);
        }
        if (!location.city || location.city.trim() === '') {
          validationErrors.push(`${input.input_title} requires a city selection`);
        }
      }
    }

    if (validationErrors.length > 0) {
      setSubmitInputError(validationErrors.join(', '));
      return;
    }

    setSubmitInputError(null);
    setIsSubmittingInput(true);

    try {
      // Prepare the request data
      const tabInputsData = tabInputs.map((input) => {
        const value = dialogFormState[input.input_id];
        const selectedFields = [];

        if (input.input_type === 'dropdown') {
          selectedFields.push({ value: value });
        } else if (input.input_type === 'multiselect') {
          selectedFields.push(...value.map(v => ({ value: v })));
        } else if (input.input_type === 'free text' || input.input_type === 'freetext') {
          selectedFields.push({ value: value.trim() });
        } else if (input.input_type === 'date') {
          // Save date as string in YYYY-MM-DD format
          selectedFields.push({ value: value || '' });
        } else if (input.input_type === 'url') {
          // Save URL as string
          selectedFields.push({ value: value.trim() || '' });
        } else if (input.input_type === 'location') {
          // Save location as JSON string
          const location = locationData[input.input_id] || { country: '', city: '', address: '' };
          const locationJson = JSON.stringify({
            country: location.country || '',
            city: location.city || '',
            address: location.address || ''
          });
          selectedFields.push({ value: locationJson });
        }

        return {
          input_id: input.input_id,
          input_title: input.input_title,
          input_type: input.input_type,
          input_fields: input.input_fields || null,
          selected_input_fields: selectedFields
        };
      });

      const requestData = {
        tab_title: selectedTab.name,
        input_creator: `${currentUser.name} ${currentUser.surname}`,
        tab_id: selectedTab.id,
        tab_inputs: tabInputsData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Submit or update based on edit mode
      if (editingInput) {
        // Update existing input
        await updateCommunityInput(community.id, editingInput.id, requestData);
        setSubmitSuccessMessage('Input updated successfully!');
      } else {
        // Create new input
        await submitCommunityInput(community.id, requestData);
        setSubmitSuccessMessage('Input submitted successfully!');
      }

      setTimeout(() => {
        setSubmitSuccessMessage(null);
      }, 5000);

      // Close dialog
      handleCloseDialog();
      
      // Refresh inputs to show updated entry in table
      const fetchedInputs = await getCommunityInputs(community.id, selectedTab.id);
      
      const groupedInputs = {};
      fetchedInputs.forEach(input => {
        const createdDate = new Date(input.created_at);
        const groupKey = `${input.creator_name || 'Unknown'}_${Math.floor(createdDate.getTime() / 1000)}`;
        
        if (!groupedInputs[groupKey]) {
          groupedInputs[groupKey] = {
            id: input.id,
            creator: input.creator_name || 'Unknown',
            creator_username: input.creator_username || null,
            creator_email: input.creator_email || null,
            createdAt: input.created_at,
            category: selectedCategory,
            inputs: []
          };
        }
        
        const typeDisplayMap = {
          'free text': 'Free Text',
          'dropdown list': 'Dropdown',
          'multiple select': 'Multiple Select',
          'date': 'Date',
          'url': 'URL',
          'location': 'Location'
        };
        const displayType = typeDisplayMap[input.type] || input.type;
        
        // For URL type, value might be in items or directly in value
        let inputValue = '';
        if (input.type === 'url') {
          inputValue = input.items?.[0]?.value || input.items?.map(item => item.value).join(', ') || '';
        } else {
          inputValue = input.items?.map(item => item.value).join(', ') || '';
        }
        
        groupedInputs[groupKey].inputs.push({
          id: input.id,
          inputType: input.type,
          inputTitle: input.name,
          displayType: displayType,
          items: input.items || [],
          value: inputValue
        });
      });
      
      const mappedInputs = Object.values(groupedInputs).map(group => {
        const allTypes = group.inputs.map(inp => inp.displayType).join(', ');
        
        return {
          id: group.id,
          creator: group.creator,
          creator_username: group.creator_username,
          creator_email: group.creator_email,
          type: allTypes,
          createdAt: group.createdAt,
          category: group.category,
          inputs: group.inputs
        };
      });
      
      setInputs(mappedInputs);
      
      // Refresh input count
      try {
        const count = await getCommunityInputsCount(community.id);
        setInputCount(count);
      } catch (error) {
        console.error('Error refreshing input count:', error);
      }
    } catch (error) {
      console.error('Error submitting/updating input:', error);
      setSubmitInputError(error.message || `Failed to ${editingInput ? 'update' : 'submit'} input. Please try again.`);
    } finally {
      setIsSubmittingInput(false);
    }
  };

  const handleDeleteInputClick = (input) => {
    setInputToDelete(input);
    setDeleteInputError(null);
    setShowDeleteInputDialog(true);
  };

  const handleCancelDeleteInput = () => {
    setShowDeleteInputDialog(false);
    setInputToDelete(null);
    setDeleteInputError(null);
  };

  const handleConfirmDeleteInput = async () => {
    if (!inputToDelete || !community?.id) {
      setDeleteInputError('Missing required information');
      return;
    }

    setIsDeletingInput(true);
    setDeleteInputError(null);

    try {
      await deleteCommunityInput(community.id, inputToDelete.id);

      setSubmitSuccessMessage('Input deleted successfully!');
      setTimeout(() => {
        setSubmitSuccessMessage(null);
      }, 5000);

      handleCancelDeleteInput();

      const fetchedInputs = await getCommunityInputs(community.id, selectedCategory);
      
      const groupedInputs = {};
      fetchedInputs.forEach(input => {
        const createdDate = new Date(input.created_at);
        const groupKey = `${input.creator_name || 'Unknown'}_${Math.floor(createdDate.getTime() / 1000)}`;
        
        if (!groupedInputs[groupKey]) {
          groupedInputs[groupKey] = {
            id: input.id,
            creator: input.creator_name || 'Unknown',
            creator_username: input.creator_username || null,
            creator_email: input.creator_email || null,
            createdAt: input.created_at,
            category: selectedCategory,
            inputs: []
          };
        }
        
        const typeDisplayMap = {
          'free text': 'Free Text',
          'dropdown list': 'Dropdown',
          'multiple select': 'Multiple Select',
          'date': 'Date',
          'url': 'URL',
          'location': 'Location'
        };
        const displayType = typeDisplayMap[input.type] || input.type;
        
        // For URL type, value might be in items or directly in value
        let inputValue = '';
        if (input.type === 'url') {
          inputValue = input.items?.[0]?.value || input.items?.map(item => item.value).join(', ') || '';
        } else {
          inputValue = input.items?.map(item => item.value).join(', ') || '';
        }
        
        groupedInputs[groupKey].inputs.push({
          id: input.id,
          inputType: input.type,
          inputTitle: input.name,
          displayType: displayType,
          items: input.items || [],
          value: inputValue
        });
      });
      
      const mappedInputs = Object.values(groupedInputs).map(group => {
        const allTypes = group.inputs.map(inp => inp.displayType).join(', ');
        
        return {
          id: group.id,
          creator: group.creator,
          creator_username: group.creator_username,
          creator_email: group.creator_email,
          type: allTypes,
          createdAt: group.createdAt,
          category: group.category,
          inputs: group.inputs
        };
      });
      
      setInputs(mappedInputs);
      
      // Refresh input count
      try {
        const count = await getCommunityInputsCount(community.id);
        setInputCount(count);
      } catch (error) {
        console.error('Error refreshing input count:', error);
      }
    } catch (error) {
      console.error('Error deleting input:', error);
      setDeleteInputError(error.message || 'Failed to delete input. Please try again.');
    } finally {
      setIsDeletingInput(false);
    }
  };

  const selectedTab = useMemo(() => {
    if (!selectedCategory || communityTabs.length === 0) {
      return null;
    }
    const foundTab = communityTabs.find(tab => 
      tab.id === selectedCategory || 
      String(tab.id) === String(selectedCategory) ||
      tab.name === selectedCategory
    );
    console.log('Selected tab:', foundTab || communityTabs[0]);
    return foundTab || communityTabs[0];
  }, [communityTabs, selectedCategory]);


  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  useEffect(() => {
    const fetchCommunityIfNeeded = async () => {
      if (community?.id) {
        if (community.tabs === undefined && community.tabs_config === undefined) {
          console.log('Fetching full community data for ID:', community.id);
          try {
            const fullCommunity = await getCommunityById(community.id);
            const mappedCommunity = {
              id: fullCommunity.id,
              title: fullCommunity.title,
              description: fullCommunity.description,
              creator: fullCommunity.creator_name,
              creator_id: fullCommunity.creator_id,
              creator_username: fullCommunity.creator_username,
              creator_email: fullCommunity.creator_email,
              createdAt: fullCommunity.created_at,
              updatedAt: fullCommunity.updated_at,
              tabs: fullCommunity.tabs || [],
            };
            
            if (onCommunityUpdated) {
              onCommunityUpdated(mappedCommunity);
            }
          } catch (err) {
            console.error('Error fetching community in CommunityDetails:', err);
          }
        }
      }
    };
    
    fetchCommunityIfNeeded();
  }, [community?.id, community?.tabs, onCommunityUpdated]);

  useEffect(() => {
    const fetchInputs = async () => {
      if (!community?.id || !selectedCategory) {
        setInputs([]);
        return;
      }

      setIsLoadingInputs(true);
      try {
        const fetchedInputs = await getCommunityInputs(community.id, selectedCategory);
        
        const groupedInputs = {};
        fetchedInputs.forEach(input => {
          const createdDate = new Date(input.created_at);
          
          const groupKey = `${input.creator_name || 'Unknown'}_${Math.floor(createdDate.getTime() / 1000)}`;
          
          if (!groupedInputs[groupKey]) {
            groupedInputs[groupKey] = {
              id: input.id,
              creator: input.creator_name || 'Unknown',
              creator_username: input.creator_username || null,
              creator_email: input.creator_email || null,
              createdAt: input.created_at,
              category: selectedCategory,
              inputs: []
            };
          }
          
          const typeDisplayMap = {
            'free text': 'Free Text',
            'dropdown list': 'Dropdown',
            'multiple select': 'Multiple Select',
            'date': 'Date',
            'url': 'URL'
          };
        const displayType = typeDisplayMap[input.type] || input.type;
        
        // For URL type, value might be in items or directly in value
        let inputValue = '';
        if (input.type === 'url') {
          inputValue = input.items?.[0]?.value || input.items?.map(item => item.value).join(', ') || '';
        } else {
          inputValue = input.items?.map(item => item.value).join(', ') || '';
        }
        
        groupedInputs[groupKey].inputs.push({
          id: input.id,
          inputType: input.type,
          inputTitle: input.name,
          displayType: displayType,
          items: input.items || [],
          value: inputValue
        });
        });
        
        const mappedInputs = Object.values(groupedInputs).map(group => {
          const allTypes = group.inputs.map(inp => inp.displayType).join(', ');
          
          return {
            id: group.id,
            creator: group.creator,
            creator_username: group.creator_username,
            creator_email: group.creator_email,
            type: allTypes,
            createdAt: group.createdAt,
            category: group.category,
            inputs: group.inputs
          };
        });
        
        setInputs(mappedInputs);
      } catch (error) {
        console.error('Error fetching inputs:', error);
        setInputs([]);
      } finally {
        setIsLoadingInputs(false);
      }
    };

    fetchInputs();
  }, [community?.id, selectedCategory]);

  useEffect(() => {
    const fetchInputCount = async () => {
      if (!community?.id) {
        setInputCount(0);
        return;
      }

      try {
        const count = await getCommunityInputsCount(community.id);
        setInputCount(count);
      } catch (error) {
        console.error('Error fetching input count:', error);
        setInputCount(0);
      }
    };

    fetchInputCount();
  }, [community?.id]);


  useEffect(() => {
    console.log('Community prop changed:', community);
    console.log('Community tabs:', community?.tabs);
    console.log('Computed communityTabs:', communityTabs);
  }, [community, communityTabs]);

  useEffect(() => {
    // If community has selectedTabId (from admin), use it
    if (community?.selectedTabId) {
      const tabExists = communityTabs.find(tab => 
        tab.id === community.selectedTabId || 
        String(tab.id) === String(community.selectedTabId)
      );
      if (tabExists) {
        setSelectedCategory(community.selectedTabId);
        return;
      }
    }
    
    if (communityTabs.length > 0) {
      const tabExists = communityTabs.find(tab => 
        tab.id === selectedCategory || 
        String(tab.id) === String(selectedCategory)
      );
      if (!tabExists) {
        console.log('Setting selectedCategory to first tab:', communityTabs[0].id);
        setSelectedCategory(communityTabs[0].id);
      }
    } else if (selectedCategory !== null) {
      setSelectedCategory(null);
    }
  }, [communityTabs, selectedCategory, community?.selectedTabId]);

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
    setDeleteError(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!community || !community.id) {
      setDeleteError('Community information is missing.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteCommunity(community.id);
      
      if (onDeleteSuccess) {
        onDeleteSuccess(community.title || 'Community');
      }
    } catch (error) {
      setDeleteError(error.message || 'Failed to delete community. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleUpdateClick = () => {
    setUpdateForm({
      title: community?.title || '',
      description: community?.description || ''
    });
    setShowUpdateDialog(true);
    setUpdateError(null);
  };

  const handleCancelUpdate = () => {
    setShowUpdateDialog(false);
    setUpdateError(null);
    setUpdateForm({ title: '', description: '' });
  };

  const handleConfirmUpdate = async () => {
    // Validate fields
    if (!updateForm.title.trim()) {
      setUpdateError('Title cannot be empty.');
      return;
    }
    if (!updateForm.description.trim()) {
      setUpdateError('Description cannot be empty.');
      return;
    }

    if (!community || !community.id) {
      setUpdateError('Community information is missing.');
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const updatedCommunity = await updateCommunity(community.id, {
        title: updateForm.title.trim(),
        description: updateForm.description.trim()
      });

      // Map API response to match expected format
      const mappedCommunity = {
        id: updatedCommunity.id,
        title: updatedCommunity.title,
        description: updatedCommunity.description,
        creator: updatedCommunity.creator_name,
        creator_id: updatedCommunity.creator_id,
        creator_username: updatedCommunity.creator_username,
        creator_email: updatedCommunity.creator_email,
        createdAt: updatedCommunity.created_at,
        updatedAt: updatedCommunity.updated_at,
        tabs: updatedCommunity.tabs || community?.tabs || [],
      };

      // Call the update callback to update the displayed values
      if (onCommunityUpdated) {
        onCommunityUpdated(mappedCommunity);
      }

      setShowUpdateDialog(false);
      setUpdateForm({ title: '', description: '' });
    } catch (error) {
      setUpdateError(error.message || 'Failed to update community. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="community-details">
      <div className="community-details-wrapper">
        <div className="details-header">
          <div className="details-content">
            <h1 className="details-title">{title}</h1>
            <p className="details-description">{description}</p>
          </div>
          <aside className="meta-card">
            <h2 className="meta-title">Community Details</h2>
            <dl className="meta-list">
              <div>
                <dt>Community owner</dt>
                <dd>
                  {creatorUsername ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectUser && creatorUsername) {
                          onSelectUser({ username: creatorUsername });
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: '#2563eb',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        fontSize: 'inherit',
                        fontWeight: 'inherit'
                      }}
                    >
                      {communityOwner}
                    </button>
                  ) : (
                    communityOwner
                  )}
                </dd>
              </div>
              <div>
                <dt>Created at</dt>
                <dd>{createdAt}</dd>
              </div>
              <div>
                <dt>Number of inputs</dt>
                <dd>{inputCount}</dd>
              </div>
            </dl>
            {hasAdminPrivileges && (
              <div className="community-actions">
                <button
                  className="update-community-button"
                  onClick={() => {
                    if (onNavigateToUpdate) {
                      onNavigateToUpdate(community);
                    }
                  }}
                  aria-label="Update community"
                  title="Update this community"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Update Community
                </button>
                <button
                  className="delete-community-button"
                  onClick={handleDeleteClick}
                  aria-label="Delete community"
                  title="Delete this community"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete Community
                </button>
              </div>
            )}
          </aside>
        </div>

        <section className="inputs-section">
          {/* Category Tabs */}
          {communityTabs.length > 0 ? (
            <>
              <div className="category-tabs-container">
                {communityTabs.map((tab) => {
                  const isActive = selectedCategory === tab.id || String(selectedCategory) === String(tab.id);
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={`category-tab ${isActive ? 'active' : ''}`}
                      onClick={() => handleCategoryChange(tab.id)}
                      style={{
                        '--tab-color': tab.color || '#f97316',
                      }}
                    >
                      <span className="category-tab-label">{tab.name || tab.label}</span>
                    </button>
                  );
                })}
              </div>
              
              {/* Category Description */}
              {selectedTab?.description && (
                <div className="category-description">
                  <p>{selectedTab.description}</p>
                </div>
              )}
            </>
          ) : (
            <div className="no-tabs-message">
              <p>No tabs configured for this community.</p>
            </div>
          )}

          <div className="inputs-layout">
            <div className="inputs-table-wrapper">
              <div className="inputs-table-header-actions">
                <h2 className="inputs-table-title">Community Inputs</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
                  {selectedTab && (
                    <button
                      type="button"
                      onClick={() => {
                        if (Object.keys(activeFilters).length > 0) {
                          handleClearFilters();
                        } else {
                          // Initialize filter form state with existing active filters
                          const tabInputs = selectedTab?.tab_form_structure?.tab_inputs || [];
                          const initialState = {};
                          tabInputs.forEach(input => {
                            const filter = activeFilters[input.input_title];
                            if (filter) {
                              if (input.input_type === 'location') {
                                initialState[`${input.input_id}_location`] = {
                                  country: filter.country || '',
                                  city: filter.city || ''
                                };
                              } else {
                                initialState[input.input_id] = filter.values || filter.value || '';
                              }
                            }
                          });
                          setFilterFormState(initialState);
                          setShowFilterDialog(true);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        border: Object.keys(activeFilters).length > 0 ? '2px solid #2563eb' : '1px solid #d1d5db',
                        borderRadius: '6px',
                        backgroundColor: Object.keys(activeFilters).length > 0 ? '#eff6ff' : 'white',
                        color: Object.keys(activeFilters).length > 0 ? '#2563eb' : '#374151',
                        cursor: 'pointer',
                        fontWeight: Object.keys(activeFilters).length > 0 ? 500 : 400
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                      </svg>
                      {Object.keys(activeFilters).length > 0 ? 'Clear Filter' : 'Filter'}
                    </button>
                  )}
                  <input
                    type="text"
                    placeholder="Search inputs..."
                    value={inputSearchQuery}
                    onChange={(e) => setInputSearchQuery(e.target.value)}
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      outline: 'none',
                      minWidth: '250px'
                    }}
                  />
                  {selectedTab && currentUser && (
                    <button
                      type="button"
                      className="add-input-button"
                      onClick={handleOpenDialog}
                    >
                      Add Input to tab {selectedTab.name || ''}
                    </button>
                  )}
                </div>
              </div>
              {submitSuccessMessage && (
                <div className="success-message" style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#d1fae5',
                  color: '#065f46',
                  borderRadius: '8px',
                  border: '1px solid #6ee7b7',
                  marginBottom: '1rem',
                  fontSize: '0.9rem'
                }}>
                  {submitSuccessMessage}
                </div>
              )}
              <div className="inputs-table-card">
                <div className="inputs-table-header">
                  <div className="header-cell created-by">
                    <span>Created by</span>
                    <button
                      type="button"
                      className="header-action"
                      onClick={() => handleSort('creator')}
                    >
                      Sort {getSortIndicator(sortConfig.column, 'creator', sortConfig.direction)}
                    </button>
                  </div>
                  <div className="header-cell created-at">
                    <span>Created at</span>
                    <button
                      type="button"
                      className="header-action"
                      onClick={() => handleSort('createdAt')}
                    >
                      Sort {getSortIndicator(sortConfig.column, 'createdAt', sortConfig.direction)}
                    </button>
                  </div>
                  <div className="header-cell details">
                    <span>Details</span>
                  </div>
                  <div className="header-cell actions">
                    <span>Actions</span>
                  </div>
                </div>
              <div className="inputs-table-body">
                {isLoadingInputs ? (
                  <div className="empty-state">
                    <p>Loading inputs...</p>
                  </div>
                ) : (
                  <>
                    {filteredAndSortedInputs.map((input) => {
                      const isInputCreator = currentUser && input.creator && (
                        input.creator === currentUser.username ||
                        input.creator === `${currentUser.name} ${currentUser.surname}`.trim()
                      );
                      const canEditInput = isInputCreator || isAdmin;
                      return (
                        <div className="inputs-table-row" key={input.id}>
                          <div className="cell created-by">
                            <button
                              type="button"
                              onClick={async () => {
                                if (!onSelectUser) return;
                                
                                // If we have creator_username, use it directly
                                if (input.creator_username) {
                                  try {
                                    const user = await getUserByUsername(input.creator_username);
                                    if (user) {
                                      onSelectUser(user);
                                      return;
                                    }
                                  } catch (error) {
                                    console.log('Could not find user by username:', input.creator_username);
                                  }
                                }
                                
                                // Fallback: Try to find user by creator name (could be full name or username)
                                try {
                                  // First try as username
                                  const user = await getUserByUsername(input.creator);
                                  if (user) {
                                    onSelectUser(user);
                                    return;
                                  }
                                } catch (error) {
                                  // If not found as username, try searching by name
                                  try {
                                    const users = await getUsersByName(input.creator);
                                    if (users && users.length > 0) {
                                      // Use the first match
                                      const user = users[0];
                                      let dateOfBirth = null;
                                      if (user.date_of_birth) {
                                        dateOfBirth = String(user.date_of_birth).split('T')[0];
                                      }
                                      onSelectUser({
                                        id: user.id,
                                        username: user.username,
                                        email: user.email,
                                        name: user.name,
                                        surname: user.surname,
                                        profession: user.profession,
                                        dateOfBirth: dateOfBirth,
                                      });
                                      return;
                                    }
                                  } catch (searchError) {
                                    console.log('Could not find user:', input.creator);
                                  }
                                }
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                color: '#2563eb',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                fontSize: 'inherit',
                                fontWeight: 'inherit'
                              }}
                            >
                              {input.creator || 'Unknown'}
                            </button>
                          </div>
                          <div className="cell created-at">
                            {formatDate(input.createdAt)}
                          </div>
                          <div className="cell details">
                            <button
                              type="button"
                              className="details-link"
                              onClick={() => setDetailsItem(input)}
                            >
                              See details
                            </button>
                          </div>
                          <div className="cell actions">
                            {canEditInput && (
                              <>
                                <button
                                  type="button"
                                  className="action-button edit-button"
                                  onClick={() => handleEditInput(input)}
                                  title="Edit"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  className="action-button delete-button"
                                  onClick={() => handleDeleteInputClick(input)}
                                  title="Delete"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              </>
                            )}
                            {!canEditInput && <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>-</span>}
                          </div>
                        </div>
                      );
                    })}
                    {!filteredAndSortedInputs.length && !isLoadingInputs && (
                      <div className="empty-state">
                        <p>{inputSearchQuery ? 'No matching inputs found for your search.' : 'No community inputs found for the selected filters.'}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {detailsItem && (
        <div
          className="details-modal-backdrop"
          role="presentation"
          onClick={() => setDetailsItem(null)}
        >
          <div
            className="details-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="details-modal-header">
              <h3>Input added by {detailsItem.creator_username || detailsItem.creator}</h3>
              <button
                type="button"
                className="modal-close-button"
                onClick={() => setDetailsItem(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <dl className="details-modal-content">
              <div>
                <dd style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      Created by
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!onSelectUser) return;
                        
                        // If we have creator_username, use it directly
                        if (detailsItem.creator_username) {
                          try {
                            const user = await getUserByUsername(detailsItem.creator_username);
                            if (user) {
                              onSelectUser(user);
                              setDetailsItem(null); // Close dialog
                              return;
                            }
                          } catch (error) {
                            console.log('Could not find user by username:', detailsItem.creator_username);
                          }
                        }
                        
                        // Fallback: Try to find user by creator name (could be full name or username)
                        try {
                          // First try as username
                          const user = await getUserByUsername(detailsItem.creator);
                          if (user) {
                            onSelectUser(user);
                            setDetailsItem(null); // Close dialog
                            return;
                          }
                        } catch (error) {
                          // If not found as username, try searching by name
                          try {
                            const users = await getUsersByName(detailsItem.creator);
                            if (users && users.length > 0) {
                              // Use the first match
                              const user = users[0];
                              let dateOfBirth = null;
                              if (user.date_of_birth) {
                                dateOfBirth = String(user.date_of_birth).split('T')[0];
                              }
                              onSelectUser({
                                id: user.id,
                                username: user.username,
                                email: user.email,
                                name: user.name,
                                surname: user.surname,
                                profession: user.profession,
                                dateOfBirth: dateOfBirth,
                              });
                              setDetailsItem(null); // Close dialog
                              return;
                            }
                          } catch (searchError) {
                            console.log('Could not find user:', detailsItem.creator);
                          }
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: '#2563eb',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        fontSize: 'inherit',
                        fontWeight: 'inherit',
                        textAlign: 'left'
                      }}
                    >
                      {detailsItem.creator_username || detailsItem.creator}
                    </button>
                  </div>
                  {hasAdminPrivileges && detailsItem.creator_email && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                        Contact Information
                      </div>
                      <div>{detailsItem.creator_email}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      Created at
                    </div>
                    <div>{formatDate(detailsItem.createdAt)}</div>
                  </div>
                </dd>
              </div>
              {detailsItem.inputs && detailsItem.inputs.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <dd>
                    {detailsItem.inputs.map((input, idx) => (
                      <div key={idx} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: idx < detailsItem.inputs.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#0f172a' }}>
                          {input.inputTitle}
                        </div>
                        {input.items && input.items.length > 0 ? (
                          <ul style={{ fontSize: '0.875rem', color: '#334155', margin: '0.25rem 0 0 1.5rem', padding: 0 }}>
                            {input.items.map((item, itemIdx) => {
                              const itemValue = item.value || item;
                              // Check if this is a URL type input
                              if (input.inputType === 'url') {
                                return (
                                  <li key={itemIdx}>
                                    <a
                                      href={itemValue}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        color: '#2563eb',
                                        textDecoration: 'underline',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {itemValue}
                                    </a>
                                  </li>
                                );
                              }
                              // Check if this is a location type input
                              if (input.inputType === 'location') {
                                try {
                                  const location = JSON.parse(itemValue);
                                  return (
                                    <li key={itemIdx}>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <div><strong>Country:</strong> {location.country || 'N/A'}</div>
                                        <div><strong>City:</strong> {location.city || 'N/A'}</div>
                                        {location.address && (
                                          <div><strong>Address:</strong> {location.address}</div>
                                        )}
                                      </div>
                                    </li>
                                  );
                                } catch (e) {
                                  return <li key={itemIdx}>{itemValue}</li>;
                                }
                              }
                              return <li key={itemIdx}>{itemValue}</li>;
                            })}
                          </ul>
                        ) : (
                          <div style={{ fontSize: '0.875rem', color: '#334155' }}>
                            {input.inputType === 'url' && input.value ? (
                              <a
                                href={input.value}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: '#2563eb',
                                  textDecoration: 'underline',
                                  cursor: 'pointer'
                                }}
                              >
                                {input.value}
                              </a>
                            ) : input.inputType === 'location' && input.value ? (
                              (() => {
                                try {
                                  const location = JSON.parse(input.value);
                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                      <div><strong>Country:</strong> {location.country || 'N/A'}</div>
                                      <div><strong>City:</strong> {location.city || 'N/A'}</div>
                                      {location.address && (
                                        <div><strong>Address:</strong> {location.address}</div>
                                      )}
                                    </div>
                                  );
                                } catch (e) {
                                  return input.value || 'N/A';
                                }
                              })()
                            ) : (
                              input.value || 'N/A'
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
            <div className="details-modal-footer">
              <button
                type="button"
                className="primary-button"
                onClick={() => setDetailsItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div
          className="delete-dialog-backdrop"
          role="presentation"
          onClick={handleCancelDelete}
        >
          <div
            className="delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="delete-dialog-header">
              <h3 id="delete-dialog-title">Delete Community</h3>
              <button
                type="button"
                className="dialog-close-button"
                onClick={handleCancelDelete}
                aria-label="Close"
                disabled={isDeleting}
              >
                ×
              </button>
            </div>
            <div className="delete-dialog-content">
              <p>
                Are you sure you want to delete the community <strong>"{title}"</strong>?
              </p>
              <p style={{ color: '#dc2626', marginTop: '0.5rem' }}>
                This action cannot be undone.
              </p>
              {deleteError && (
                <div className="delete-error-message" style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#fee',
                  color: '#c33',
                  borderRadius: '4px',
                  border: '1px solid #fcc'
                }}>
                  {deleteError}
                </div>
              )}
            </div>
            <div className="delete-dialog-footer">
              <button
                type="button"
                className="dialog-cancel-button"
                onClick={handleCancelDelete}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dialog-delete-button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Input Dialog */}
      {showAddInputDialog && (
        <div
          className="add-input-dialog-backdrop"
          role="presentation"
          onClick={handleCloseDialog}
        >
          <div
            className="add-input-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-input-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="add-input-dialog-header">
              <h3 id="add-input-dialog-title">
                {editingInput ? 'Edit input' : 'Fill form to add the input'}
              </h3>
              <button
                type="button"
                className="dialog-close-button"
                onClick={handleCloseDialog}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="add-input-dialog-content">
              {submitInputError && (
                <div className="dialog-error-message" style={{
                  padding: '0.75rem',
                  backgroundColor: '#fee',
                  color: '#c33',
                  borderRadius: '4px',
                  border: '1px solid #fcc',
                  marginBottom: '1rem'
                }}>
                  {submitInputError}
                </div>
              )}
              {selectedTab?.tab_form_structure && selectedTab.tab_form_structure.tab_inputs && selectedTab.tab_form_structure.tab_inputs.length > 0 ? (
                selectedTab.tab_form_structure.tab_inputs.map((input) => (
                <div key={input.input_id} className="dialog-input-group">
                  <label className="dialog-input-label">
                    {input.input_title}
                    {(input.input_type === 'freetext' || input.input_type === 'free text') && (
                      <span className="char-count-indicator">
                        ({dialogFormState[input.input_id]?.length || 0} / 200)
                      </span>
                    )}
                  </label>
                  
                  {input.input_type === 'dropdown' && (
                    <select
                      className="dialog-form-select"
                      value={dialogFormState[input.input_id] || ''}
                      onChange={(e) =>
                        setDialogFormState((prev) => ({
                          ...prev,
                          [input.input_id]: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select option</option>
                      {input.input_fields?.map((field, idx) => (
                        <option key={idx} value={field.value}>
                          {field.value}
                        </option>
                      ))}
                    </select>
                  )}

                  {input.input_type === 'multiselect' && (
                    <div className="dialog-multiselect-container">
                      {input.input_fields?.map((field, idx) => (
                        <label key={idx} className="dialog-checkbox-option">
                          <input
                            type="checkbox"
                            checked={(dialogFormState[input.input_id] || []).includes(field.value)}
                            onChange={(e) => {
                              const currentValues = dialogFormState[input.input_id] || [];
                              if (e.target.checked) {
                                setDialogFormState((prev) => ({
                                  ...prev,
                                  [input.input_id]: [...currentValues, field.value],
                                }));
                              } else {
                                setDialogFormState((prev) => ({
                                  ...prev,
                                  [input.input_id]: currentValues.filter(v => v !== field.value),
                                }));
                              }
                            }}
                          />
                          <span>{field.value}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {(input.input_type === 'freetext' || input.input_type === 'free text') && (
                    <textarea
                      className="dialog-form-textarea"
                      placeholder="Enter details..."
                      value={dialogFormState[input.input_id] || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 200) {
                          setDialogFormState((prev) => ({
                            ...prev,
                            [input.input_id]: value,
                          }));
                        }
                      }}
                      maxLength={200}
                      rows={4}
                    />
                  )}

                  {input.input_type === 'date' && (
                    <input
                      type="date"
                      className="dialog-form-input"
                      value={dialogFormState[input.input_id] || ''}
                      onChange={(e) => {
                        setDialogFormState((prev) => ({
                          ...prev,
                          [input.input_id]: e.target.value,
                        }));
                      }}
                      onKeyDown={(e) => {
                        // Prevent typing, only allow date picker selection
                        e.preventDefault();
                      }}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        fontSize: '0.875rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
                  )}

                  {input.input_type === 'url' && (
                    <input
                      type="url"
                      className="dialog-form-input"
                      placeholder="https://example.com"
                      value={dialogFormState[input.input_id] || ''}
                      onChange={(e) => {
                        setDialogFormState((prev) => ({
                          ...prev,
                          [input.input_id]: e.target.value,
                        }));
                      }}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        fontSize: '0.875rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        outline: 'none'
                      }}
                    />
                  )}

                  {input.input_type === 'location' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {/* Country Selection */}
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                          Country *
                        </label>
                        <select
                          className="dialog-form-select"
                          value={locationData[input.input_id]?.country || ''}
                          onChange={async (e) => {
                            const selectedCountry = e.target.value;
                            setLocationData(prev => ({
                              ...prev,
                              [input.input_id]: {
                                country: selectedCountry,
                                city: '', // Reset city when country changes
                                address: prev[input.input_id]?.address || ''
                              }
                            }));
                            // Fetch cities for selected country
                            if (selectedCountry) {
                              await fetchCitiesForCountry(selectedCountry);
                            }
                          }}
                          disabled={loadingCities[locationData[input.input_id]?.country] || false}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            fontSize: '0.875rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            outline: 'none',
                            cursor: loadingCities[locationData[input.input_id]?.country] ? 'not-allowed' : 'pointer',
                            opacity: loadingCities[locationData[input.input_id]?.country] ? 0.6 : 1
                          }}
                        >
                          <option value="">Select country</option>
                          {COUNTRIES.map(country => (
                            <option key={country} value={country}>{country}</option>
                          ))}
                        </select>
                      </div>

                      {/* City Selection */}
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                          City *
                        </label>
                        <select
                          className="dialog-form-select"
                          value={locationData[input.input_id]?.city || ''}
                          onChange={(e) => {
                            setLocationData(prev => ({
                              ...prev,
                              [input.input_id]: {
                                ...prev[input.input_id],
                                city: e.target.value
                              }
                            }));
                          }}
                          disabled={!locationData[input.input_id]?.country || loadingCities[locationData[input.input_id]?.country]}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            fontSize: '0.875rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            outline: 'none',
                            cursor: (!locationData[input.input_id]?.country || loadingCities[locationData[input.input_id]?.country]) ? 'not-allowed' : 'pointer',
                            opacity: (!locationData[input.input_id]?.country || loadingCities[locationData[input.input_id]?.country]) ? 0.6 : 1
                          }}
                        >
                          {loadingCities[locationData[input.input_id]?.country] ? (
                            <option value="">Loading cities...</option>
                          ) : !locationData[input.input_id]?.country ? (
                            <option value="">Select country first</option>
                          ) : (
                            <>
                              <option value="">Select city</option>
                              <option value="">Proceed with empty city</option>
                              {citiesData[locationData[input.input_id]?.country]?.map(city => (
                                <option key={city} value={city}>{city}</option>
                              ))}
                            </>
                          )}
                        </select>
                      </div>

                      {/* Address (Optional) */}
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                          Detailed Address (Optional)
                        </label>
                        <textarea
                          className="dialog-form-textarea"
                          placeholder="Enter detailed address..."
                          value={locationData[input.input_id]?.address || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.length <= 500) {
                              setLocationData(prev => ({
                                ...prev,
                                [input.input_id]: {
                                  ...prev[input.input_id],
                                  address: value
                                }
                              }));
                            }
                          }}
                          maxLength={500}
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            fontSize: '0.875rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            outline: 'none',
                            resize: 'vertical'
                          }}
                        />
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                          {(locationData[input.input_id]?.address || '').length} / 500 characters
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                ))
              ) : (
                <div className="dialog-empty-message">
                  <p>No input fields configured for this tab.</p>
                </div>
              )}
            </div>
            <div className="add-input-dialog-footer">
              <button
                type="button"
                className="dialog-cancel-button"
                onClick={handleCloseDialog}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dialog-add-button"
                onClick={handleAddInput}
                disabled={isSubmittingInput}
              >
                {isSubmittingInput 
                  ? (editingInput ? 'Updating...' : 'Submitting...') 
                  : (editingInput ? 'Update' : 'Add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Input Confirmation Dialog */}
      {showDeleteInputDialog && inputToDelete && (
        <div
          className="delete-dialog-backdrop"
          role="presentation"
          onClick={handleCancelDeleteInput}
        >
          <div
            className="delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-input-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="delete-dialog-header">
              <h3 id="delete-input-dialog-title">Delete Input</h3>
              <button
                type="button"
                className="dialog-close-button"
                onClick={handleCancelDeleteInput}
                aria-label="Close"
                disabled={isDeletingInput}
              >
                ×
              </button>
            </div>
            <div className="delete-dialog-content">
              <p>
                Are you sure you want to delete this input entry?
              </p>
              <p style={{ color: '#dc2626', marginTop: '0.5rem' }}>
                This action cannot be undone.
              </p>
              {deleteInputError && (
                <div className="delete-error-message" style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#fee',
                  color: '#c33',
                  borderRadius: '4px',
                  border: '1px solid #fcc'
                }}>
                  {deleteInputError}
                </div>
              )}
            </div>
            <div className="delete-dialog-footer">
              <button
                type="button"
                className="dialog-cancel-button"
                onClick={handleCancelDeleteInput}
                disabled={isDeletingInput}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dialog-delete-button"
                onClick={handleConfirmDeleteInput}
                disabled={isDeletingInput}
              >
                {isDeletingInput ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Community Dialog */}
      {showUpdateDialog && (
        <div
          className="update-dialog-backdrop"
          role="presentation"
          onClick={handleCancelUpdate}
        >
          <div
            className="update-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="update-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="update-dialog-header">
              <h3 id="update-dialog-title">Update Community</h3>
              <button
                type="button"
                className="dialog-close-button"
                onClick={handleCancelUpdate}
                aria-label="Close"
                disabled={isUpdating}
              >
                ×
              </button>
            </div>
            <div className="update-dialog-content">
              <div className="update-form-group">
                <label htmlFor="update-title" className="update-form-label">
                  Title
                </label>
                <input
                  id="update-title"
                  type="text"
                  className="update-form-input"
                  value={updateForm.title}
                  onChange={(e) => setUpdateForm({ ...updateForm, title: e.target.value })}
                  placeholder="Community title"
                  maxLength={200}
                  disabled={isUpdating}
                />
                <div className="update-character-count">
                  {updateForm.title.length} / 200
                </div>
              </div>
              <div className="update-form-group">
                <label htmlFor="update-description" className="update-form-label">
                  Description
                </label>
                <textarea
                  id="update-description"
                  className="update-form-textarea"
                  value={updateForm.description}
                  onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })}
                  placeholder="Community description"
                  maxLength={500}
                  rows={6}
                  disabled={isUpdating}
                />
                <div className="update-character-count">
                  {updateForm.description.length} / 500
                </div>
              </div>
              {updateError && (
                <div className="update-error-message">
                  {updateError}
                </div>
              )}
            </div>
            <div className="update-dialog-footer">
              <button
                type="button"
                className="dialog-cancel-button"
                onClick={handleCancelUpdate}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dialog-update-button"
                onClick={handleConfirmUpdate}
                disabled={isUpdating || !updateForm.title.trim() || !updateForm.description.trim()}
              >
                {isUpdating ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Dialog */}
      {showFilterDialog && selectedTab && (
        <div
          className="dialog-backdrop"
          onClick={() => setShowFilterDialog(false)}
        >
          <div
            className="dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}
          >
            <div className="dialog-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
              <h3>Filter Inputs</h3>
              <button
                type="button"
                className="modal-close-button"
                onClick={() => setShowFilterDialog(false)}
                aria-label="Close"
                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }}
              >
                ×
              </button>
            </div>
            <div className="dialog-content" style={{ padding: '1.5rem' }}>
              {/* Active Filters List */}
              {Object.keys(activeFilters).length > 0 && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: '#374151' }}>
                    Active Filters:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {Object.entries(activeFilters).map(([inputTitle, filter]) => (
                      <div
                        key={inputTitle}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          backgroundColor: '#2563eb',
                          color: 'white',
                          borderRadius: '6px',
                          fontSize: '0.875rem'
                        }}
                      >
                        <span>{inputTitle}: {filter.type === 'dropdown' || filter.type === 'multiselect' ? filter.values.join(', ') : filter.type === 'date' ? `Before ${filter.value}` : filter.type === 'location' ? `${filter.country || ''}${filter.city ? `, ${filter.city}` : ''}` : filter.value}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter(inputTitle)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: '1rem',
                            lineHeight: 1
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter Form */}
              {selectedTab.tab_form_structure?.tab_inputs && selectedTab.tab_form_structure.tab_inputs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {selectedTab.tab_form_structure.tab_inputs.map((input) => {
                    // Skip URL input types - no filtering option needed
                    if (input.input_type === 'url') {
                      return null;
                    }
                    
                    const uniqueLocations = getUniqueLocations();
                    
                    return (
                      <div key={input.input_id} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                          {input.input_title}
                        </label>

                        {/* Dropdown Filter */}
                        {input.input_type === 'dropdown' && (
                          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.5rem' }}>
                            {getUniqueValuesForInput(input.input_title).map(value => (
                              <label
                                key={value}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem',
                                  cursor: 'pointer',
                                  borderRadius: '4px',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <input
                                  type="checkbox"
                                  checked={(filterFormState[input.input_id] || []).includes(value)}
                                  onChange={(e) => {
                                    const currentValues = filterFormState[input.input_id] || [];
                                    if (e.target.checked) {
                                      setFilterFormState(prev => ({
                                        ...prev,
                                        [input.input_id]: [...currentValues, value]
                                      }));
                                    } else {
                                      setFilterFormState(prev => ({
                                        ...prev,
                                        [input.input_id]: currentValues.filter(v => v !== value)
                                      }));
                                    }
                                  }}
                                  style={{ cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '0.875rem' }}>{value}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* Multiselect Filter */}
                        {input.input_type === 'multiselect' && (
                          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.5rem' }}>
                            {getUniqueValuesForInput(input.input_title).map(value => (
                              <label
                                key={value}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem',
                                  cursor: 'pointer',
                                  borderRadius: '4px',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <input
                                  type="checkbox"
                                  checked={(filterFormState[input.input_id] || []).includes(value)}
                                  onChange={(e) => {
                                    const currentValues = filterFormState[input.input_id] || [];
                                    if (e.target.checked) {
                                      setFilterFormState(prev => ({
                                        ...prev,
                                        [input.input_id]: [...currentValues, value]
                                      }));
                                    } else {
                                      setFilterFormState(prev => ({
                                        ...prev,
                                        [input.input_id]: currentValues.filter(v => v !== value)
                                      }));
                                    }
                                  }}
                                  style={{ cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '0.875rem' }}>{value}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* Free Text Filter */}
                        {(input.input_type === 'free text' || input.input_type === 'freetext') && (
                          <input
                            type="text"
                            placeholder="Search in this field..."
                            value={filterFormState[input.input_id] || ''}
                            onChange={(e) => {
                              setFilterFormState(prev => ({
                                ...prev,
                                [input.input_id]: e.target.value
                              }));
                            }}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              fontSize: '0.875rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              outline: 'none'
                            }}
                          />
                        )}

                        {/* Date Filter */}
                        {input.input_type === 'date' && (
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                              Show entries with date earlier than:
                            </label>
                            <input
                              type="date"
                              value={filterFormState[input.input_id] || ''}
                              onChange={(e) => {
                                setFilterFormState(prev => ({
                                  ...prev,
                                  [input.input_id]: e.target.value
                                }));
                              }}
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                fontSize: '0.875rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                outline: 'none'
                              }}
                            />
                          </div>
                        )}

                        {/* Location Filter */}
                        {input.input_type === 'location' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                                Country (optional)
                              </label>
                              <select
                                value={filterFormState[`${input.input_id}_location`]?.country || ''}
                                onChange={(e) => {
                                  setFilterFormState(prev => ({
                                    ...prev,
                                    [`${input.input_id}_location`]: {
                                      ...prev[`${input.input_id}_location`],
                                      country: e.target.value,
                                      city: e.target.value ? prev[`${input.input_id}_location`]?.city || '' : '' // Clear city if country changes
                                    }
                                  }));
                                }}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  fontSize: '0.875rem',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  outline: 'none'
                                }}
                              >
                                <option value="">All countries</option>
                                {uniqueLocations.countries.map(country => (
                                  <option key={country} value={country}>{country}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                                City (optional)
                              </label>
                              <select
                                value={filterFormState[`${input.input_id}_location`]?.city || ''}
                                onChange={(e) => {
                                  setFilterFormState(prev => ({
                                    ...prev,
                                    [`${input.input_id}_location`]: {
                                      ...prev[`${input.input_id}_location`],
                                      city: e.target.value
                                    }
                                  }));
                                }}
                                disabled={!filterFormState[`${input.input_id}_location`]?.country}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  fontSize: '0.875rem',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  outline: 'none',
                                  opacity: !filterFormState[`${input.input_id}_location`]?.country ? 0.6 : 1
                                }}
                              >
                                <option value="">All cities</option>
                                {filterFormState[`${input.input_id}_location`]?.country && uniqueLocations.cities[filterFormState[`${input.input_id}_location`].country]?.map(city => (
                                  <option key={city} value={city}>{city}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  No input fields configured for this tab.
                </div>
              )}
            </div>
            <div className="dialog-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="dialog-cancel-button"
                onClick={() => setShowFilterDialog(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dialog-add-button"
                onClick={handleApplyFilters}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityDetails;