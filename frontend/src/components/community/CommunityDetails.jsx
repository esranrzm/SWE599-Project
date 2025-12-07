import React, { useMemo, useState, useEffect } from 'react';
import './CommunityDetails.css';
import { deleteCommunity, updateCommunity, getCommunityById, submitCommunityInput, getCommunityInputs, updateCommunityInput, deleteCommunityInput } from '../../services/api';


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

const CommunityDetails = ({ community, currentUser, onDeleteSuccess, onCommunityUpdated }) => {
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
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({
    column: 'createdAt',
    direction: 'desc',
  });
  const [showAddInputDialog, setShowAddInputDialog] = useState(false);
  const [dialogFormState, setDialogFormState] = useState({});
  const [editingInput, setEditingInput] = useState(null); // Store the input being edited
  const [detailsItem, setDetailsItem] = useState(null);
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
  const commentCount = community?.commentCount ?? 0;
  
  // Check if current user is the creator
  const isCreator = currentUser && community && (currentUser.id === community.creator_id || currentUser.id === community.creatorId);

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

    if (typeFilter !== 'all') {
      filtered = filtered.filter((input) => {
        return input.type && input.type.toLowerCase().includes(typeFilter.toLowerCase());
      });
    }

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
  }, [inputs, sortConfig, typeFilter, selectedCategory]);

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
        input_creator: currentUser.username || `${currentUser.name} ${currentUser.surname}`,
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
            createdAt: input.created_at,
            category: selectedCategory,
            inputs: []
          };
        }
        
        const typeDisplayMap = {
          'free text': 'Free Text',
          'dropdown list': 'Dropdown',
          'multiple select': 'Multiple Select'
        };
        const displayType = typeDisplayMap[input.type] || input.type;
        
        groupedInputs[groupKey].inputs.push({
          id: input.id,
          inputType: input.type,
          inputTitle: input.name,
          displayType: displayType,
          items: input.items || [],
          value: input.items?.map(item => item.value).join(', ') || ''
        });
      });
      
      const mappedInputs = Object.values(groupedInputs).map(group => {
        const allTypes = group.inputs.map(inp => inp.displayType).join(', ');
        
        return {
          id: group.id,
          creator: group.creator,
          type: allTypes,
          createdAt: group.createdAt,
          category: group.category,
          inputs: group.inputs
        };
      });
      
      setInputs(mappedInputs);
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
            createdAt: input.created_at,
            category: selectedCategory,
            inputs: []
          };
        }
        
        const typeDisplayMap = {
          'free text': 'Free Text',
          'dropdown list': 'Dropdown',
          'multiple select': 'Multiple Select'
        };
        const displayType = typeDisplayMap[input.type] || input.type;
        
        groupedInputs[groupKey].inputs.push({
          id: input.id,
          inputType: input.type,
          inputTitle: input.name,
          displayType: displayType,
          items: input.items || [],
          value: input.items?.map(item => item.value).join(', ') || ''
        });
      });
      
      const mappedInputs = Object.values(groupedInputs).map(group => {
        const allTypes = group.inputs.map(inp => inp.displayType).join(', ');
        
        return {
          id: group.id,
          creator: group.creator,
          type: allTypes,
          createdAt: group.createdAt,
          category: group.category,
          inputs: group.inputs
        };
      });
      
      setInputs(mappedInputs);
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

  const getAvailableInputTypes = () => {
    if (!selectedTab) {
      return [];
    }
    const inputTypes = selectedTab?.inputTypes || selectedTab?.input_types || [];
    if (Array.isArray(inputTypes) && inputTypes.length > 0) {
      return inputTypes.map(inputType => ({
        value: inputType.type === 'free text' ? 'freeText' : 
               inputType.type === 'dropdown list' ? 'dropdownList' : 
               inputType.type === 'multiple select' ? 'multipleSelect' : inputType.type,
        label: inputType.name || inputType.type,
        config: inputType
      }));
    }
    return [];
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setTypeFilter('all');
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
              createdAt: input.created_at,
              category: selectedCategory,
              inputs: []
            };
          }
          
          const typeDisplayMap = {
            'free text': 'Free Text',
            'dropdown list': 'Dropdown',
            'multiple select': 'Multiple Select'
          };
          const displayType = typeDisplayMap[input.type] || input.type;
          
          groupedInputs[groupKey].inputs.push({
            id: input.id,
            inputType: input.type,
            inputTitle: input.name,
            displayType: displayType,
            items: input.items || [],
            value: input.items?.map(item => item.value).join(', ') || ''
          });
        });
        
        const mappedInputs = Object.values(groupedInputs).map(group => {
          const allTypes = group.inputs.map(inp => inp.displayType).join(', ');
          
          return {
            id: group.id,
            creator: group.creator,
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
    console.log('Community prop changed:', community);
    console.log('Community tabs:', community?.tabs);
    console.log('Computed communityTabs:', communityTabs);
  }, [community, communityTabs]);

  useEffect(() => {
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
  }, [communityTabs, selectedCategory]);

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
                <dd>{communityOwner}</dd>
              </div>
              <div>
                <dt>Created at</dt>
                <dd>{createdAt}</dd>
              </div>
              <div>
                <dt>Number of comments</dt>
                <dd>{commentCount}</dd>
              </div>
            </dl>
            {isCreator && (
              <>
                <button
                  className="update-community-button"
                  onClick={handleUpdateClick}
                  aria-label="Update community"
                  title="Update this community"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete Community
                </button>
              </>
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
                {selectedTab && (
                  <button
                    type="button"
                    className="add-input-button"
                    onClick={handleOpenDialog}
                  >
                    Add Input to tab {selectedTab.name || ''}
                  </button>
                )}
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
                  <div className="header-cell type">
                    <span>Type</span>
                    <select
                      className="header-select"
                      value={typeFilter}
                      onChange={(event) => setTypeFilter(event.target.value)}
                    >
                      <option value="all">All types</option>
                      {getAvailableInputTypes().map((inputType) => (
                        <option key={inputType.value} value={inputType.label}>
                          {inputType.label}
                        </option>
                      ))}
                    </select>
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
                    {sortedAndFilteredInputs.map((input) => {
                      const isCreator = currentUser && input.creator && (
                        input.creator === currentUser.username ||
                        input.creator === `${currentUser.name} ${currentUser.surname}`.trim()
                      );
                      return (
                        <div className="inputs-table-row" key={input.id}>
                          <div className="cell created-by">{input.creator || 'Unknown'}</div>
                          <div className="cell type">{input.type || 'N/A'}</div>
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
                            {isCreator && (
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
                            {!isCreator && <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>-</span>}
                          </div>
                        </div>
                      );
                    })}
                    {!sortedAndFilteredInputs.length && !isLoadingInputs && (
                      <div className="empty-state">
                        <p>No community inputs found for the selected filters.</p>
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
              <h3>Input details</h3>
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
                <dt>Created by</dt>
                <dd>{detailsItem.creator}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{detailsItem.type}</dd>
              </div>
              <div>
                <dt>Created at</dt>
                <dd>{formatDate(detailsItem.createdAt)}</dd>
              </div>
              {detailsItem.inputs && detailsItem.inputs.length > 0 && (
                <div>
                  <dt>Input Details</dt>
                  <dd>
                    {detailsItem.inputs.map((input, idx) => (
                      <div key={idx} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: idx < detailsItem.inputs.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#0f172a' }}>
                          {input.inputTitle}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
                          Type: {input.displayType}
                        </div>
                        {input.items && input.items.length > 0 ? (
                          <div style={{ fontSize: '0.875rem', color: '#334155' }}>
                            <strong>Values:</strong>
                            <ul style={{ margin: '0.25rem 0 0 1.5rem', padding: 0 }}>
                              {input.items.map((item, itemIdx) => (
                                <li key={itemIdx}>{item.value || item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.875rem', color: '#334155' }}>
                            <strong>Value:</strong> {input.value || 'N/A'}
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
    </div>
  );
};

export default CommunityDetails;