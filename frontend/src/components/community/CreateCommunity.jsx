import React, { useState } from 'react';
import './CreateCommunity.css';

const CreateCommunity = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [communityInputs, setCommunityInputs] = useState([]);
  
  // Current input being edited
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

  const handleAddItem = () => {
    if (currentInputValue.trim()) {
      if (editingItemIndex !== null) {
        // Update existing item
        const updatedItems = [...currentItems];
        updatedItems[editingItemIndex] = currentInputValue.trim();
        setCurrentItems(updatedItems);
        setEditingItemIndex(null);
      } else {
        // Add new item
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
    const input = communityInputs.find(i => i.id === inputId);
    if (input && input.items[itemIndex]) {
      setEditingInputItemInputId(inputId);
      setEditingInputItemIndex(itemIndex);
      setEditingInputItemValue(input.items[itemIndex]);
    }
  };

  const handleSaveInputItem = (inputId, itemIndex) => {
    if (editingInputItemValue.trim()) {
      setCommunityInputs(communityInputs.map(input => {
        if (input.id === inputId) {
          const updatedItems = [...input.items];
          updatedItems[itemIndex] = editingInputItemValue.trim();
          return { ...input, items: updatedItems };
        }
        return input;
      }));
      setEditingInputItemInputId(null);
      setEditingInputItemIndex(null);
      setEditingInputItemValue('');
    }
  };

  const handleDeleteInputItem = (inputId, itemIndex) => {
    setCommunityInputs(communityInputs.map(input => {
      if (input.id === inputId) {
        return { ...input, items: input.items.filter((_, i) => i !== itemIndex) };
      }
      return input;
    }));
    if (editingInputItemInputId === inputId && editingInputItemIndex === itemIndex) {
      setEditingInputItemInputId(null);
      setEditingInputItemIndex(null);
      setEditingInputItemValue('');
    }
  };

  const handleAddInput = () => {
    if (!currentInputType || !currentInputName.trim()) {
      return;
    }

    if (currentInputType === 'free text') {
      // For free text, just add/update the input
      if (editingInputId) {
        // Update existing input
        setCommunityInputs(communityInputs.map(input => 
          input.id === editingInputId 
            ? { ...input, type: currentInputType, name: currentInputName.trim() }
            : input
        ));
        setEditingInputId(null);
      } else {
        // Add new input
        const newInput = {
          id: Date.now(),
          type: currentInputType,
          name: currentInputName.trim(),
          items: []
        };
        setCommunityInputs([...communityInputs, newInput]);
      }
      resetCurrentInput();
    } else if (currentInputType === 'dropdown list' || currentInputType === 'multiple select') {
      // For dropdown list and multiple select, need at least one item
      if (currentItems.length === 0) {
        return;
      }
      if (editingInputId) {
        // Update existing input
        setCommunityInputs(communityInputs.map(input => 
          input.id === editingInputId 
            ? { ...input, type: currentInputType, name: currentInputName.trim(), items: [...currentItems] }
            : input
        ));
        setEditingInputId(null);
      } else {
        // Add new input
        const newInput = {
          id: Date.now(),
          type: currentInputType,
          name: currentInputName.trim(),
          items: [...currentItems]
        };
        setCommunityInputs([...communityInputs, newInput]);
      }
      resetCurrentInput();
    }
  };

  const handleEditCommunityInput = (inputId) => {
    const input = communityInputs.find(i => i.id === inputId);
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
    setCommunityInputs(communityInputs.filter(input => input.id !== inputId));
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

  const isCreateDisabled = () => {
    return !title.trim() || !description.trim() || communityInputs.length === 0;
  };

  const handleCreate = () => {
    if (isCreateDisabled()) {
      return;
    }
    // TODO: Implement API call to create community
    console.log('Creating community:', {
      title,
      description,
      inputs: communityInputs
    });
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
            placeholder="Ex: Children who lives Van Agartı need a new school building with new equipments. Their current building is very old and not secure for them. They also have hard time during winter because the current building does not have heater in classrooms. Most of them got sick during school terms and miss their classes. We need structural equipments, people who are familiar with constructional work, items that can be used in classrooms."
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

        {/* Community Inputs Section */}
        <div className="form-section">
          <h2 className="section-title">Community Inputs</h2>
          
          {/* Display added community inputs */}
          {communityInputs.length > 0 && (
            <div className="added-inputs-container">
              {communityInputs.map((input) => (
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

          {/* Current input form */}
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

              {/* Items list for dropdown/multiple select - positioned on the right */}
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

        {/* Create Button */}
        <div className="create-button-container">
          <button
            className="btn-create"
            onClick={handleCreate}
            disabled={isCreateDisabled()}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCommunity;

