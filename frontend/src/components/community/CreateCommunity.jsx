import React, { useState } from 'react';
import './CreateCommunity.css';
import { createCommunity } from '../../services/api';

const CreateCommunity = ({ onCommunityCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tabs, setTabs] = useState([]);
  
  // Tab creation state
  const [newTabName, setNewTabName] = useState('');
  const [newTabColor, setNewTabColor] = useState('#f97316');
  const [newTabDescription, setNewTabDescription] = useState('');
  const [showTabForm, setShowTabForm] = useState(false);
  
  // Selected tab for input configuration
  const [selectedTabId, setSelectedTabId] = useState(null);
  // Track which tabs are expanded
  const [expandedTabs, setExpandedTabs] = useState(new Set());
  
  // Input configuration state (for selected tab)
  const [editingInputId, setEditingInputId] = useState(null);
  const [currentInputType, setCurrentInputType] = useState('');
  const [currentInputName, setCurrentInputName] = useState('');
  const [currentInputValue, setCurrentInputValue] = useState('');
  const [currentItems, setCurrentItems] = useState([]);
  
  // Editing states for items
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [editingInputItemIndex, setEditingInputItemIndex] = useState(null);
  const [editingInputItemInputId, setEditingInputItemInputId] = useState(null);
  const [editingInputItemValue, setEditingInputItemValue] = useState('');

  const MAX_TITLE_LENGTH = 200;
  const MAX_DESCRIPTION_LENGTH = 500;

  const createId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  // Tab management
  const handleAddTab = () => {
    if (!newTabName.trim()) {
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
    setSelectedTabId(newTab.id);
    // Auto-expand the newly created tab
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
    // Also set as selected when expanding
    if (!expandedTabs.has(tabId)) {
      setSelectedTabId(tabId);
    }
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
    if (selectedTabId === tabId) {
      setSelectedTabId(tabs.length > 1 ? tabs.find(t => t.id !== tabId)?.id || null : null);
    }
  };

  const selectedTab = tabs.find(tab => tab.id === selectedTabId);

  // Input management (for selected tab)
  const handleAddItem = () => {
    if (currentInputValue.trim()) {
      if (editingItemIndex !== null) {
        const updatedItems = [...currentItems];
        updatedItems[editingItemIndex] = currentInputValue.trim();
        setCurrentItems(updatedItems);
        setEditingItemIndex(null);
      } else {
        setCurrentItems([...currentItems, currentInputValue.trim()]);
      }
      setCurrentInputValue('');
    }
  };

  const handleDeleteItem = (index) => {
    setCurrentItems(currentItems.filter((_, i) => i !== index));
    if (editingItemIndex === index) {
      setEditingItemIndex(null);
      setCurrentInputValue('');
    }
  };

  const handleEditItem = (index) => {
    setEditingItemIndex(index);
    setCurrentInputValue(currentItems[index]);
  };

  const handleCancelEditItem = () => {
    setEditingItemIndex(null);
    setCurrentInputValue('');
  };

  const handleEditInputItem = (inputId, itemIndex) => {
    if (!selectedTab) return;
    const input = selectedTab.inputTypes.find(i => i.id === inputId);
    if (input && input.items[itemIndex]) {
      setEditingInputItemInputId(inputId);
      setEditingInputItemIndex(itemIndex);
      setEditingInputItemValue(input.items[itemIndex]);
    }
  };

  const handleSaveInputItem = (inputId, itemIndex) => {
    if (!selectedTab) return;
    if (editingInputItemValue.trim()) {
      setTabs(tabs.map(tab => {
        if (tab.id === selectedTabId) {
          return {
            ...tab,
            inputTypes: tab.inputTypes.map(input => {
              if (input.id === inputId) {
                const updatedItems = [...input.items];
                updatedItems[itemIndex] = editingInputItemValue.trim();
                return { ...input, items: updatedItems };
              }
              return input;
            })
          };
        }
        return tab;
      }));
      setEditingInputItemInputId(null);
      setEditingInputItemIndex(null);
      setEditingInputItemValue('');
    }
  };

  const handleDeleteInputItem = (inputId, itemIndex) => {
    if (!selectedTab) return;
    setTabs(tabs.map(tab => {
      if (tab.id === selectedTabId) {
        return {
          ...tab,
          inputTypes: tab.inputTypes.map(input => {
            if (input.id === inputId) {
              return { ...input, items: input.items.filter((_, i) => i !== itemIndex) };
            }
            return input;
          })
        };
      }
      return tab;
    }));
    if (editingInputItemInputId === inputId && editingInputItemIndex === itemIndex) {
      setEditingInputItemInputId(null);
      setEditingInputItemIndex(null);
      setEditingInputItemValue('');
    }
  };

  const handleAddInput = () => {
    if (!selectedTab || !currentInputType || !currentInputName.trim()) {
      return;
    }

    if (currentInputType === 'free text') {
      const newInput = {
        id: createId(),
        type: currentInputType,
        name: currentInputName.trim(),
        items: []
      };

      if (editingInputId) {
        setTabs(tabs.map(tab => {
          if (tab.id === selectedTabId) {
            return {
              ...tab,
              inputTypes: tab.inputTypes.map(input =>
                input.id === editingInputId
                  ? { ...input, type: currentInputType, name: currentInputName.trim() }
                  : input
              )
            };
          }
          return tab;
        }));
        setEditingInputId(null);
      } else {
        setTabs(tabs.map(tab => {
          if (tab.id === selectedTabId) {
            return { ...tab, inputTypes: [...tab.inputTypes, newInput] };
          }
          return tab;
        }));
      }
      resetCurrentInput();
    } else if (currentInputType === 'dropdown list' || currentInputType === 'multiple select') {
      if (currentItems.length === 0) {
        return;
      }
      const newInput = {
        id: createId(),
        type: currentInputType,
        name: currentInputName.trim(),
        items: [...currentItems]
      };

      if (editingInputId) {
        setTabs(tabs.map(tab => {
          if (tab.id === selectedTabId) {
            return {
              ...tab,
              inputTypes: tab.inputTypes.map(input =>
                input.id === editingInputId
                  ? { ...input, type: currentInputType, name: currentInputName.trim(), items: [...currentItems] }
                  : input
              )
            };
          }
          return tab;
        }));
        setEditingInputId(null);
      } else {
        setTabs(tabs.map(tab => {
          if (tab.id === selectedTabId) {
            return { ...tab, inputTypes: [...tab.inputTypes, newInput] };
          }
          return tab;
        }));
      }
      resetCurrentInput();
    }
  };

  const handleEditCommunityInput = (inputId) => {
    if (!selectedTab) return;
    const input = selectedTab.inputTypes.find(i => i.id === inputId);
    if (input) {
      setEditingInputId(inputId);
      setCurrentInputType(input.type);
      setCurrentInputName(input.name);
      setCurrentItems([...input.items]);
      setCurrentInputValue('');
    }
  };

  const handleCancelEdit = () => {
    resetCurrentInput();
    setEditingInputId(null);
  };

  const resetCurrentInput = () => {
    setCurrentInputType('');
    setCurrentInputName('');
    setCurrentInputValue('');
    setCurrentItems([]);
    setEditingItemIndex(null);
  };

  const handleDeleteCommunityInput = (inputId) => {
    if (!selectedTab) return;
    setTabs(tabs.map(tab => {
      if (tab.id === selectedTabId) {
        return {
          ...tab,
          inputTypes: tab.inputTypes.filter(input => input.id !== inputId)
        };
      }
      return tab;
    }));
    if (editingInputId === inputId) {
      resetCurrentInput();
      setEditingInputId(null);
    }
  };

  const isAddInputDisabled = () => {
    if (!currentInputType || !currentInputName.trim()) {
      return true;
    }
    if (currentInputType === 'dropdown list' || currentInputType === 'multiple select') {
      return currentItems.length === 0;
    }
    return false;
  };

  const getAddInputButtonText = () => {
    return editingInputId ? 'Update Input' : 'Add Input';
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
      // Note: tabs_config will be stored in separate table later
      // For now, we just create the community without tabs
      const communityData = {
        title: title.trim(),
        description: description.trim(),
        // tabs_config will be saved to separate table in future implementation
      };
      
      // Log tabs for now (will be saved to database later)
      if (tabs.length > 0) {
        console.log('Tabs configuration (will be saved to separate table later):', tabs);
      }

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
        // tabs_config will come from separate table in future
        tabs_config: tabs.length > 0 ? tabs.map(tab => ({
          id: tab.id,
          name: tab.name,
          color: tab.color,
          description: tab.description,
          inputTypes: tab.inputTypes.map(input => ({
            type: input.type,
            name: input.name,
            items: input.items || []
          }))
        })) : null,
      };
      
      setTitle('');
      setDescription('');
      setTabs([]);
      setSelectedTabId(null);
      setExpandedTabs(new Set());
      
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

  const showInputValueField = () => {
    return currentInputType === 'dropdown list' || currentInputType === 'multiple select';
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
                return (
                  <div key={tab.id} className={`tab-card ${isExpanded ? 'expanded' : 'collapsed'}`}>
                    <div className="tab-header">
                      <button
                        type="button"
                        className={`tab-button ${selectedTabId === tab.id ? 'active' : ''}`}
                        onClick={() => toggleTabExpansion(tab.id)}
                        style={{
                          '--tab-color': tab.color,
                          backgroundColor: selectedTabId === tab.id ? tab.color : '#ffffff',
                          color: selectedTabId === tab.id ? '#ffffff' : '#334155',
                          borderColor: tab.color,
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
                          {tab.inputTypes.length} input type{tab.inputTypes.length !== 1 ? 's' : ''}
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
                        {selectedTabId === tab.id && (
                    <div className="tab-input-types">
                      <h3 className="input-types-title">Input Types for "{tab.name}"</h3>
                      {tab.inputTypes.length > 0 && (
                        <div className="added-inputs-container">
                          {tab.inputTypes.map((input) => (
                            <div key={input.id} className="added-input-card">
                              <div className="added-input-header">
                                <span className="added-input-name">{input.name}</span>
                                <span className="added-input-type">({input.type})</span>
                                <div className="added-input-actions">
                                  <button
                                    className="edit-input-btn"
                                    onClick={() => handleEditCommunityInput(input.id)}
                                    disabled={editingInputId === input.id}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="delete-input-btn"
                                    onClick={() => handleDeleteCommunityInput(input.id)}
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                              {input.items.length > 0 && (
                                <div className="added-input-items">
                                  {input.items.map((item, idx) => (
                                    <div key={idx} className="added-item-wrapper">
                                      {editingInputItemInputId === input.id && editingInputItemIndex === idx ? (
                                        <div className="edit-item-input-wrapper">
                                          <input
                                            type="text"
                                            className="edit-item-input"
                                            value={editingInputItemValue}
                                            onChange={(e) => setEditingInputItemValue(e.target.value)}
                                            onKeyPress={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleSaveInputItem(input.id, idx);
                                              }
                                            }}
                                          />
                                          <button
                                            className="save-item-btn"
                                            onClick={() => handleSaveInputItem(input.id, idx)}
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
                                          <span className="added-item-tag">Ex: {item}</span>
                                          <div className="item-actions">
                                            <button
                                              className="edit-item-btn"
                                              onClick={() => handleEditInputItem(input.id, idx)}
                                            >
                                              Edit
                                            </button>
                                            <button
                                              className="delete-item-btn-small"
                                              onClick={() => handleDeleteInputItem(input.id, idx)}
                                            >
                                              ×
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Input form for selected tab */}
                      <div className="input-form">
                        <div className="input-form-layout">
                          <div className="input-form-left">
                            <div className="input-form-row">
                              <div className="input-field-group">
                                <label className="input-label">Input type</label>
                                <select
                                  className="form-select"
                                  value={currentInputType}
                                  onChange={(e) => setCurrentInputType(e.target.value)}
                                >
                                  <option value="">Select input type</option>
                                  <option value="dropdown list">Dropdown list</option>
                                  <option value="free text">Free text</option>
                                  <option value="multiple select">Multiple select</option>
                                </select>
                              </div>

                              {showInputValueField() && (
                                <>
                                  <div className="input-field-group">
                                    <label className="input-label">Input value</label>
                                    <input
                                      type="text"
                                      className="form-input"
                                      value={currentInputValue}
                                      onChange={(e) => setCurrentInputValue(e.target.value)}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleAddItem();
                                        }
                                      }}
                                    />
                                  </div>
                                  <div className="add-item-button-wrapper">
                                    <button
                                      className="btn-add-item"
                                      onClick={handleAddItem}
                                      disabled={!currentInputValue.trim()}
                                    >
                                      Add Item
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>

                            <div className="input-form-row">
                              <div className="input-field-group">
                                <label className="input-label">Input name</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={currentInputName}
                                  onChange={(e) => setCurrentInputName(e.target.value)}
                                />
                              </div>
                            </div>
                          </div>

                          {showInputValueField() && currentItems.length > 0 && (
                            <div className="items-container">
                              <div className="items-count">
                                Current list item count : {currentItems.length}
                              </div>
                              <div className="items-box">
                                {currentItems.map((item, index) => (
                                  <div key={index} className="item-card">
                                    {editingItemIndex === index ? (
                                      <div className="edit-item-input-wrapper">
                                        <input
                                          type="text"
                                          className="edit-item-input"
                                          value={currentInputValue}
                                          onChange={(e) => setCurrentInputValue(e.target.value)}
                                          onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              handleAddItem();
                                            }
                                          }}
                                        />
                                        <button
                                          className="save-item-btn"
                                          onClick={handleAddItem}
                                        >
                                          ✓
                                        </button>
                                        <button
                                          className="cancel-item-btn"
                                          onClick={handleCancelEditItem}
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
                                            onClick={() => handleEditItem(index)}
                                          >
                                            Edit
                                          </button>
                                          <button
                                            className="delete-item-btn"
                                            onClick={() => handleDeleteItem(index)}
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

                        <div className="add-input-actions">
                          <button
                            className="btn-add-input"
                            onClick={handleAddInput}
                            disabled={isAddInputDisabled()}
                          >
                            {getAddInputButtonText()}
                          </button>
                          {editingInputId && (
                            <button
                              className="btn-cancel-edit"
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                        )}
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
            <button
              className="btn-create-tab"
              onClick={() => setShowTabForm(true)}
            >
              + Create New Tab
            </button>
          )}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="create-community-message error-message" style={{
            padding: '12px',
            marginBottom: '20px',
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '4px',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}
        {success && (
          <div className="create-community-message success-message" style={{
            padding: '12px',
            marginBottom: '20px',
            backgroundColor: '#efe',
            color: '#3c3',
            borderRadius: '4px',
            border: '1px solid #cfc'
          }}>
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
    </div>
  );
};

export default CreateCommunity;
