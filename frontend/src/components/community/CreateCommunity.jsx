import React, { useState } from 'react';
import './CreateCommunity.css';
import { createCommunity } from '../../services/api';

const CreateCommunity = ({ onCommunityCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tabs, setTabs] = useState([]);
  
  const [newTabName, setNewTabName] = useState('');
  const [newTabColor, setNewTabColor] = useState('#f97316');
  const [newTabDescription, setNewTabDescription] = useState('');
  const [showTabForm, setShowTabForm] = useState(false);
  
  const [expandedTabs, setExpandedTabs] = useState(new Set());
  
  const [inputStates, setInputStates] = useState({});
  
  const [editingInputItemIndex, setEditingInputItemIndex] = useState(null);
  const [editingInputItemInputId, setEditingInputItemInputId] = useState(null);
  const [editingInputItemValue, setEditingInputItemValue] = useState('');

  const [addItemsDialogOpen, setAddItemsDialogOpen] = useState(false);
  const [addItemsDialogTabId, setAddItemsDialogTabId] = useState(null);
  const [addItemsDialogInput, setAddItemsDialogInput] = useState('');
  const [addItemsDialogError, setAddItemsDialogError] = useState('');

  const MAX_TITLE_LENGTH = 200;
  const MAX_DESCRIPTION_LENGTH = 500;
  const MAX_TABS = 10;

  const createId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const getInputState = (tabId) => {
    if (!inputStates[tabId]) {
      return {
        editingInputId: null,
        currentInputType: '',
        currentInputName: '',
        currentInputValue: '',
        currentItems: []
      };
    }
    return inputStates[tabId];
  };

  const updateInputState = (tabId, updates) => {
    setInputStates(prev => {
      const currentState = prev[tabId] || {
        editingInputId: null,
        currentInputType: '',
        currentInputName: '',
        currentInputValue: '',
        currentItems: []
      };
      return {
        ...prev,
        [tabId]: { ...currentState, ...updates }
      };
    });
  };

  const handleAddTab = () => {
    if (!newTabName.trim()) {
      return;
    }

    if (tabs.length >= MAX_TABS) {
      setError(`Maximum ${MAX_TABS} tabs allowed per community`);
      return;
    }

    const newTab = {
      id: createId(),
      name: newTabName.trim(),
      color: newTabColor,
      description: newTabDescription.trim() || null,
      inputTypes: []
    };

    setTabs([...tabs, newTab]);
    setNewTabName('');
    setNewTabColor('#f97316');
    setNewTabDescription('');
    setShowTabForm(false);
    setError(null);
    setExpandedTabs(prev => new Set([...prev, newTab.id]));
  };

  const toggleTabExpansion = (tabId) => {
    setExpandedTabs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tabId)) {
        newSet.delete(tabId);
      } else {
        newSet.add(tabId);
      }
      return newSet;
    });
  };

  const isTabExpanded = (tabId) => {
    return expandedTabs.has(tabId);
  };

  const handleDeleteTab = (tabId) => {
    setTabs(tabs.filter(tab => tab.id !== tabId));
    setExpandedTabs(prev => {
      const newSet = new Set(prev);
      newSet.delete(tabId);
      return newSet;
    });
    setInputStates(prev => {
      const newStates = { ...prev };
      delete newStates[tabId];
      return newStates;
    });
  };


  const handleAddItem = (tabId) => {
    const state = getInputState(tabId);
    if (state.currentInputValue.trim()) {
      const updatedItems = [...state.currentItems, state.currentInputValue.trim()];
      updateInputState(tabId, {
        currentItems: updatedItems,
        currentInputValue: ''
      });
    }
  };

  const handleDeleteItem = (tabId, index) => {
    const state = getInputState(tabId);
    const updatedItems = state.currentItems.filter((_, i) => i !== index);
    updateInputState(tabId, { currentItems: updatedItems });
  };

  const handleEditItem = (tabId, index) => {
    const state = getInputState(tabId);
    setEditingInputItemInputId(tabId);
    setEditingInputItemIndex(index);
    setEditingInputItemValue(state.currentItems[index]);
  };

  const handleSaveItem = (tabId, index) => {
    if (editingInputItemValue.trim()) {
      const state = getInputState(tabId);
      const updatedItems = [...state.currentItems];
      updatedItems[index] = editingInputItemValue.trim();
      updateInputState(tabId, { currentItems: updatedItems });
      setEditingInputItemInputId(null);
      setEditingInputItemIndex(null);
      setEditingInputItemValue('');
    }
  };

  const handleAddInput = (tabId) => {
    const state = getInputState(tabId);
    if (!state.currentInputType || !state.currentInputName.trim()) {
      return;
    }

    if (state.currentInputType === 'free text' || state.currentInputType === 'date' || state.currentInputType === 'url' || state.currentInputType === 'location') {
      const newInput = {
        id: createId(),
        type: state.currentInputType,
        name: state.currentInputName.trim(),
        items: []
      };

      if (state.editingInputId) {
        setTabs(tabs.map(tab => {
          if (tab.id === tabId) {
            return {
              ...tab,
              inputTypes: tab.inputTypes.map(input =>
                input.id === state.editingInputId
                  ? { ...input, type: state.currentInputType, name: state.currentInputName.trim() }
                  : input
              )
            };
          }
          return tab;
        }));
      } else {
        setTabs(tabs.map(tab => {
          if (tab.id === tabId) {
            return { ...tab, inputTypes: [...tab.inputTypes, newInput] };
          }
          return tab;
        }));
      }
      resetInputState(tabId);
    } else if (state.currentInputType === 'dropdown list' || state.currentInputType === 'multiple select') {
      if (state.currentItems.length === 0) {
        return;
      }
      const newInput = {
        id: createId(),
        type: state.currentInputType,
        name: state.currentInputName.trim(),
        items: [...state.currentItems]
      };

      if (state.editingInputId) {
        setTabs(tabs.map(tab => {
          if (tab.id === tabId) {
            return {
              ...tab,
              inputTypes: tab.inputTypes.map(input =>
                input.id === state.editingInputId
                  ? { ...input, type: state.currentInputType, name: state.currentInputName.trim(), items: [...state.currentItems] }
                  : input
              )
            };
          }
          return tab;
        }));
      } else {
        setTabs(tabs.map(tab => {
          if (tab.id === tabId) {
            return { ...tab, inputTypes: [...tab.inputTypes, newInput] };
          }
          return tab;
        }));
      }
      resetInputState(tabId);
    }
  };

  const handleEditInput = (tabId, inputId) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    const input = tab.inputTypes.find(i => i.id === inputId);
    if (input) {
      updateInputState(tabId, {
        editingInputId: inputId,
        currentInputType: input.type,
        currentInputName: input.name,
        currentItems: [...input.items],
        currentInputValue: ''
      });
    }
  };

  const handleDeleteInput = (tabId, inputId) => {
    setTabs(tabs.map(tab => {
      if (tab.id === tabId) {
        return {
          ...tab,
          inputTypes: tab.inputTypes.filter(input => input.id !== inputId)
        };
      }
      return tab;
    }));
    const state = getInputState(tabId);
    if (state.editingInputId === inputId) {
      resetInputState(tabId);
    }
  };

  const resetInputState = (tabId) => {
    updateInputState(tabId, {
      editingInputId: null,
      currentInputType: '',
      currentInputName: '',
      currentInputValue: '',
      currentItems: []
    });
  };

  const handleInputTypeChange = (tabId, value) => {
    const state = getInputState(tabId);
    updateInputState(tabId, {
      currentInputType: value,
      currentItems: (value === 'free text' || value === 'date' || value === 'url' || value === 'location') ? [] : state.currentItems,
      currentInputValue: ''
    });
  };

  const isAddInputDisabled = (tabId) => {
    const state = getInputState(tabId);
    if (!state.currentInputType || !state.currentInputName.trim()) {
      return true;
    }
    if (state.currentInputType === 'dropdown list' || state.currentInputType === 'multiple select') {
      return state.currentItems.length === 0;
    }
    return false;
  };

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const isCreateDisabled = () => {
    return !title.trim() || !description.trim() || isCreating;
  };

  const handleCreate = async () => {
    if (isCreateDisabled()) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsCreating(true);

    try {
      const tabsData = tabs.length > 0 ? tabs.map((tab, tabIndex) => ({
        name: tab.name,
        color: tab.color,
        description: tab.description || null,
        display_order: tabIndex,
        inputTypes: tab.inputTypes.map((input, inputIndex) => ({
          type: input.type,
          name: input.name,
          display_order: inputIndex,
          items: input.items.map((item, itemIndex) => ({
            value: item,
            display_order: itemIndex
          }))
        }))
      })) : null;

      const communityData = {
        title: title.trim(),
        description: description.trim(),
        tabs: tabsData
      };

      const response = await createCommunity(communityData);
      
      setSuccess(`Community "${response.title}" created successfully!`);
      
      const mappedCommunity = {
        id: response.id,
        title: response.title,
        description: response.description,
        creator: response.creator_name,
        creator_id: response.creator_id,
        createdAt: response.created_at,
        updatedAt: response.updated_at,
        tabs_config: response.tabs || null,
      };
      
      setTitle('');
      setDescription('');
      setTabs([]);
      setExpandedTabs(new Set());
      setInputStates({});
      
      setTimeout(() => {
        if (onCommunityCreated) {
          onCommunityCreated(mappedCommunity);
        }
      }, 1000);
      
      console.log('Community created:', response);
    } catch (err) {
      setError(err.message || 'Failed to create community. Please try again.');
      console.error('Error creating community:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const showInputValueField = (tabId) => {
    const state = getInputState(tabId);
    return state.currentInputType === 'dropdown list' || state.currentInputType === 'multiple select';
  };

  const getInputTypeDisplayName = (type) => {
    if (type === 'dropdown list') return 'Dropdown';
    if (type === 'multiple select') return 'Multi-Select';
    if (type === 'free text') return 'Free Text';
    if (type === 'date') return 'Date';
    if (type === 'url') return 'URL';
    if (type === 'location') return 'Location';
    return type;
  };

  const handleOpenAddItemsDialog = (tabId) => {
    setAddItemsDialogTabId(tabId);
    setAddItemsDialogInput('');
    setAddItemsDialogError('');
    setAddItemsDialogOpen(true);
  };

  const handleCloseAddItemsDialog = () => {
    setAddItemsDialogOpen(false);
    setAddItemsDialogTabId(null);
    setAddItemsDialogInput('');
    setAddItemsDialogError('');
  };

  const validateItemsInput = (input) => {
    if (!input.trim()) {
      return { valid: false, error: 'Please enter at least one item.' };
    }

    const trimmed = input.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Please enter at least one item.' };
    }
    const items = trimmed.split(',').map(item => item.trim()).filter(item => item.length > 0);
    if (items.length === 0) {
      return { valid: false, error: 'Please enter at least one valid item.' };
    }
    return { valid: true, items };
  };

  const handleAddItemsAtOnce = () => {
    if (!addItemsDialogTabId) return;

    const validation = validateItemsInput(addItemsDialogInput);
    if (!validation.valid) {
      setAddItemsDialogError(validation.error);
      return;
    }

    
    const state = getInputState(addItemsDialogTabId);
    const updatedItems = [...state.currentItems, ...validation.items];
    updateInputState(addItemsDialogTabId, {
      currentItems: updatedItems
    });

    // Close dialog
    handleCloseAddItemsDialog();
  };

  const getSelectedInputTypeDisplay = (tabId) => {
    const state = getInputState(tabId);
    if (state.currentInputType === 'dropdown list') return 'Dropdown';
    if (state.currentInputType === 'multiple select') return 'Multi-Select';
    return state.currentInputType;
  };

  return (
    <div className="create-community">
      <div className="create-community-card">
        <h1 className="create-title">Create Community</h1>
        
        {/* Community Title Section */}
        <div className="form-section">
          <h2 className="section-title">Community Title</h2>
          <input
            type="text"
            className="form-input"
            placeholder="Ex: Children in Van need a new school building"
            value={title}
            onChange={(e) => {
              if (e.target.value.length <= MAX_TITLE_LENGTH) {
                setTitle(e.target.value);
              }
            }}
            maxLength={MAX_TITLE_LENGTH}
          />
          <div className="character-count">
            {title.length} / {MAX_TITLE_LENGTH}
          </div>
        </div>

        {/* Community Description Section */}
        <div className="form-section">
          <h2 className="section-title">Community Description</h2>
          <textarea
            className="form-textarea"
            placeholder="Ex: Children who lives Van Agartı need a new school building with new equipments..."
            value={description}
            onChange={(e) => {
              if (e.target.value.length <= MAX_DESCRIPTION_LENGTH) {
                setDescription(e.target.value);
              }
            }}
            maxLength={MAX_DESCRIPTION_LENGTH}
            rows={6}
          />
          <div className="character-count">
            {description.length} / {MAX_DESCRIPTION_LENGTH}
          </div>
        </div>

        {/* Tabs Section */}
        <div className="form-section">
          <h2 className="section-title">Community Input Tabs</h2>
          <p className="section-description">
            Create tabs to organize different types of community inputs. Each tab can have its own input types.
          </p>

          {/* Display created tabs */}
          {tabs.length > 0 && (
            <div className="tabs-container">
              {tabs.map((tab) => {
                const isExpanded = isTabExpanded(tab.id);
                const inputState = getInputState(tab.id);
                return (
                  <div key={tab.id} className={`tab-card ${isExpanded ? 'expanded' : 'collapsed'}`}>
                    <div className="tab-header">
                      <button
                        type="button"
                        className="tab-button"
                        onClick={() => toggleTabExpansion(tab.id)}
                        style={{
                          backgroundColor: tab.color,
                          color: '#ffffff',
                        }}
                      >
                        <span className="tab-button-content">
                          <span className="tab-name">{tab.name}</span>
                          <span className="tab-expand-icon">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        </span>
                      </button>
                      <div className="tab-header-actions">
                        <span className="tab-input-count">
                          {tab.inputTypes.length} input{tab.inputTypes.length !== 1 ? 's' : ''}
                        </span>
                        <button
                          type="button"
                          className="delete-tab-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTab(tab.id);
                          }}
                          title="Delete tab"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <>
                        {tab.description && (
                          <p className="tab-description">{tab.description}</p>
                        )}
                        
                        {/* Display existing inputs */}
                        {tab.inputTypes.length > 0 && (
                          <div className="added-inputs-container">
                            {tab.inputTypes.map((input) => (
                              <div key={input.id} className="added-input-card">
                                <div className="added-input-header">
                                  <span className="added-input-name">{input.name}</span>
                                  <span className="added-input-type">({getInputTypeDisplayName(input.type)})</span>
                                  <div className="added-input-actions">
                                    <button
                                      className="edit-input-btn"
                                      onClick={() => handleEditInput(tab.id, input.id)}
                                      disabled={inputState.editingInputId === input.id}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="delete-input-btn"
                                      onClick={() => handleDeleteInput(tab.id, input.id)}
                                    >
                                      ×
                                    </button>
                                  </div>
                                </div>
                                {input.items.length > 0 && (
                                  <div className="added-input-items">
                                    {input.items.map((item, idx) => (
                                      <span key={idx} className="added-item-tag">{item}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add Form for Tab */}
                        <div className="tab-form-section">
                          <h3 className="tab-form-title">Add Form for "{tab.name}" tab</h3>
                          
                          {/* Input Title and Input Type side by side */}
                          <div className="input-form-row-single">
                            <div className="input-field-group">
                              <label className="input-label">Input Title</label>
                              <input
                                type="text"
                                className="form-input"
                                value={inputState.currentInputName}
                                onChange={(e) => updateInputState(tab.id, { currentInputName: e.target.value })}
                                placeholder="Enter input title"
                              />
                            </div>
                            <div className="input-field-group">
                              <label className="input-label">Input Type</label>
                              <select
                                className="form-select"
                                value={inputState.currentInputType}
                                onChange={(e) => handleInputTypeChange(tab.id, e.target.value)}
                              >
                                <option value="">Select input type</option>
                                <option value="free text">Free Text</option>
                                <option value="dropdown list">Dropdown</option>
                                <option value="multiple select">Multi-Select</option>
                                <option value="date">Date</option>
                                <option value="url">URL</option>
                                <option value="location">Location</option>
                              </select>
                            </div>
                          </div>

                          {/* Nested card for dropdown/multi-select */}
                          {showInputValueField(tab.id) && (
                            <div className="nested-input-card">
                              <div className="nested-card-title-row">
                                <h4 className="nested-card-title">
                                  Add input field for input "{inputState.currentInputName || '[input title]'}"
                                </h4>
                                <button
                                  className="btn-add-items-at-once"
                                  onClick={() => handleOpenAddItemsDialog(tab.id)}
                                  title="Add multiple items at once"
                                >
                                  add items at once
                                </button>
                              </div>
                              <div className="nested-card-content">
                                <div className="nested-input-row">
                                  <div className="input-field-group">
                                    <label className="input-label">Input value</label>
                                    <input
                                      type="text"
                                      className="form-input"
                                      value={inputState.currentInputValue}
                                      onChange={(e) => updateInputState(tab.id, { currentInputValue: e.target.value })}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleAddItem(tab.id);
                                        }
                                      }}
                                      placeholder="Enter field value"
                                    />
                                  </div>
                                  <div className="add-item-button-wrapper">
                                    <button
                                      className="btn-add-item"
                                      onClick={() => handleAddItem(tab.id)}
                                      disabled={!inputState.currentInputValue.trim()}
                                    >
                                      Add Item
                                    </button>
                                  </div>
                                  {inputState.currentItems.length > 0 && (
                                    <div className="items-list-container">
                                      <div className="items-count">
                                        Current list item count: {inputState.currentItems.length}
                                      </div>
                                      <div className="items-box">
                                        {inputState.currentItems.map((item, index) => (
                                          <div key={index} className="item-card">
                                            {editingInputItemInputId === tab.id && editingInputItemIndex === index ? (
                                              <div className="edit-item-input-wrapper">
                                                <input
                                                  type="text"
                                                  className="edit-item-input"
                                                  value={editingInputItemValue}
                                                  onChange={(e) => setEditingInputItemValue(e.target.value)}
                                                  onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                      e.preventDefault();
                                                      handleSaveItem(tab.id, index);
                                                    }
                                                  }}
                                                />
                                                <button
                                                  className="save-item-btn"
                                                  onClick={() => handleSaveItem(tab.id, index)}
                                                >
                                                  ✓
                                                </button>
                                                <button
                                                  className="cancel-item-btn"
                                                  onClick={() => {
                                                    setEditingInputItemInputId(null);
                                                    setEditingInputItemIndex(null);
                                                    setEditingInputItemValue('');
                                                  }}
                                                >
                                                  ×
                                                </button>
                                              </div>
                                            ) : (
                                              <>
                                                <span>Ex: {item}</span>
                                                <div className="item-actions">
                                                  <button
                                                    className="edit-item-btn"
                                                    onClick={() => handleEditItem(tab.id, index)}
                                                  >
                                                    Edit
                                                  </button>
                                                  <button
                                                    className="delete-item-btn"
                                                    onClick={() => handleDeleteItem(tab.id, index)}
                                                  >
                                                    ×
                                                  </button>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Save Field Button */}
                          <div className="save-field-actions">
                            <button
                              className="btn-save-field"
                              onClick={() => handleAddInput(tab.id)}
                              disabled={isAddInputDisabled(tab.id)}
                            >
                              {inputState.editingInputId ? 'Update Field' : 'Save Field'}
                            </button>
                            {inputState.editingInputId && (
                              <button
                                className="btn-cancel-edit"
                                onClick={() => resetInputState(tab.id)}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab creation form */}
          {showTabForm ? (
            <div className="tab-creation-form">
              <h3 className="form-subtitle">Create New Tab</h3>
              <div className="tab-form-row">
                <div className="input-field-group">
                  <label className="input-label">Tab Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newTabName}
                    onChange={(e) => setNewTabName(e.target.value)}
                    placeholder="Enter tab name"
                  />
                </div>
                <div className="input-field-group">
                  <label className="input-label">Tab Color</label>
                  <input
                    type="color"
                    className="form-input-color"
                    value={newTabColor}
                    onChange={(e) => setNewTabColor(e.target.value)}
                  />
                </div>
              </div>
              <div className="input-field-group">
                <label className="input-label">Tab Description (Optional)</label>
                <textarea
                  className="form-textarea"
                  value={newTabDescription}
                  onChange={(e) => setNewTabDescription(e.target.value)}
                  placeholder="Describe what content should be added in this tab..."
                  rows={2}
                />
              </div>
              <div className="tab-form-actions">
                <button
                  className="btn-add-tab"
                  onClick={handleAddTab}
                  disabled={!newTabName.trim()}
                >
                  Create Tab
                </button>
                <button
                  className="btn-cancel-tab"
                  onClick={() => {
                    setShowTabForm(false);
                    setNewTabName('');
                    setNewTabColor('#f97316');
                    setNewTabDescription('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <button
                className="btn-create-tab"
                onClick={() => {
                  if (tabs.length >= MAX_TABS) {
                    setError(`Maximum ${MAX_TABS} tabs allowed per community`);
                  } else {
                    setError(null);
                    setShowTabForm(true);
                  }
                }}
                disabled={tabs.length >= MAX_TABS}
              >
                + Create New Tab
              </button>
              {tabs.length >= MAX_TABS && (
                <p className="tab-limit-message">
                  Maximum {MAX_TABS} tabs allowed ({tabs.length}/{MAX_TABS})
                </p>
              )}
            </div>
          )}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="create-community-message error-message">
            {error}
          </div>
        )}
        {success && (
          <div className="create-community-message success-message">
            {success}
          </div>
        )}

        {/* Create Button */}
        <div className="create-button-container">
          <button
            className="btn-create"
            onClick={handleCreate}
            disabled={isCreateDisabled()}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      {/* Add Items at Once Dialog */}
      {addItemsDialogOpen && (
        <div className="dialog-overlay" onClick={handleCloseAddItemsDialog}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="dialog-title">
              Configure {getSelectedInputTypeDisplay(addItemsDialogTabId)} items at once
            </h3>
            <p className="dialog-description">
              Instead of adding one by one you can add all {getSelectedInputTypeDisplay(addItemsDialogTabId).toLowerCase()} options at once from here. You need to enter the following format "option1, option2, ...".
            </p>
            <div className="dialog-input-group">
              <textarea
                className="dialog-textarea"
                value={addItemsDialogInput}
                onChange={(e) => {
                  setAddItemsDialogInput(e.target.value);
                  setAddItemsDialogError('');
                }}
                placeholder='Please enter the items you want to add in "item1, item2, item3, ..." format'
                rows={4}
              />
              {addItemsDialogError && (
                <div className="dialog-error-message">
                  {addItemsDialogError}
                </div>
              )}
            </div>
            <div className="dialog-actions">
              <button
                className="btn-dialog-cancel"
                onClick={handleCloseAddItemsDialog}
              >
                Cancel
              </button>
              <button
                className="btn-dialog-add"
                onClick={handleAddItemsAtOnce}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCommunity;
