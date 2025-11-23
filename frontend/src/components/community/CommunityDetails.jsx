import React, { useMemo, useState } from 'react';
import './CommunityDetails.css';
import { deleteCommunity, updateCommunity } from '../../services/api';

const inputTypeOptions = [
  { value: 'freeText', label: 'Free text' },
  { value: 'multipleSelect', label: 'Multiple select' },
  { value: 'dropdownList', label: 'Drop down list' },
];

const dropdownItems = [
  'Student Chair',
  'Classroom Heater',
  'Whiteboard',
  'School Supplies Kit',
];

const multiSelectOptions = [
  'I know how to construct a wall',
  'I can work in library set up',
  'I can work in tool management',
  'I can help with electrical installations',
];

const defaultInputs = [
  {
    id: '1',
    creator: 'alivel123',
    type: 'Free text',
    createdAt: '2025-10-30T09:30:00Z',
    details:
      'We can organize a bake sale to raise funds for new desks. I am ready to coordinate volunteers.',
  },
  {
    id: '2',
    creator: 'alivel124',
    type: 'Drop down list',
    createdAt: '2025-10-30T16:45:00Z',
    details: 'Student Chair — I can donate 100 student chairs.',
  },
  {
    id: '3',
    creator: 'alivel125',
    type: 'Free text',
    createdAt: '2025-10-31T08:21:00Z',
    details: 'I will contact local carpenters to see if they can help.',
  },
  {
    id: '4',
    creator: 'alivel126',
    type: 'Multiple select',
    createdAt: '2025-11-01T10:12:00Z',
    details:
      'Skills: I know how to construct a wall, I can work in tool management.',
  },
  {
    id: '5',
    creator: 'alivel127',
    type: 'Free text',
    createdAt: '2025-11-02T13:57:00Z',
    details: 'I can organize transport for donated items from nearby cities.',
  },
  {
    id: '6',
    creator: 'alivel128',
    type: 'Free text',
    createdAt: '2025-10-30T12:05:00Z',
    details:
      'Local NGO promised to donate heating equipment if we arrange logistics.',
  },
];

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
  const [selectedInputType, setSelectedInputType] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [inputs, setInputs] = useState(() => {
    const provided = Array.isArray(community?.inputs) ? community.inputs : [];
    if (provided.length) {
      return provided;
    }
    return defaultInputs;
  });
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({
    column: 'createdAt',
    direction: 'desc',
  });
  const [formState, setFormState] = useState({
    freeText: '',
    dropdown: { item: '', explanation: '' },
    multipleSelect: new Set(),
  });
  const [formError, setFormError] = useState('');
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

  // Use community prop values directly - they will update when prop changes
  const title = community?.title || 'Community Title';
  const description = community?.description || 'No description provided.';
  // Support both API format (creator_name) and mapped format (creator)
  const communityOwner = community?.creator || community?.creator_name || 'Unknown';
  // Support both API format (created_at) and mapped format (createdAt)
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
    const filtered =
      typeFilter === 'all'
        ? inputs
        : inputs.filter((input) => input.type === typeFilter);

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
  }, [inputs, sortConfig, typeFilter]);

  const resetFormState = () => {
    setFormState({
      freeText: '',
      dropdown: { item: '', explanation: '' },
      multipleSelect: new Set(),
    });
    setFormError('');
  };

  const handleNewEntryAdded = (detailsText, typeLabel) => {
    const newInput = {
      id: createId(),
      creator: currentUser,
      type: typeLabel,
      createdAt: new Date().toISOString(),
      details: detailsText,
    };
    setInputs((prev) => [newInput, ...prev]);
    resetFormState();
    setIsFormVisible(false);
    setSelectedInputType('');
  };

  const handleAddFreeText = () => {
    if (!formState.freeText.trim()) {
      setFormError('Please enter a value before adding.');
      return;
    }
    handleNewEntryAdded(formState.freeText.trim(), 'Free text');
  };

  const handleAddDropdown = () => {
    const { item, explanation } = formState.dropdown;
    if (!item) {
      setFormError('Please select an item before adding.');
      return;
    }
    const detailsText = explanation
      ? `${item} — ${explanation.trim()}`
      : item;
    handleNewEntryAdded(detailsText, 'Drop down list');
  };

  const handleAddMultipleSelect = () => {
    const selections = Array.from(formState.multipleSelect);
    if (!selections.length) {
      setFormError('Please select at least one option before adding.');
      return;
    }
    handleNewEntryAdded(
      `Skills: ${selections.join(', ')}`,
      'Multiple select',
    );
  };

  const handleCheckboxChange = (value) => {
    setFormState((prev) => {
      const updated = new Set(prev.multipleSelect);
      if (updated.has(value)) {
        updated.delete(value);
      } else {
        updated.add(value);
      }
      return { ...prev, multipleSelect: updated };
    });
  };

  const renderInputForm = () => {
    if (!isFormVisible || !selectedInputType) {
      return (
        <div className="input-placeholder-card">
          <p>Select an input type and click on “Add New Community Input” to get started.</p>
        </div>
      );
    }

    return (
      <div className="input-form-card">
        {formError && <div className="form-error">{formError}</div>}
        {selectedInputType === 'freeText' && (
          <>
            <label className="form-label" htmlFor="freeTextInput">
              Input value
            </label>
            <textarea
              id="freeTextInput"
              className="form-textarea"
              placeholder="Enter your contribution..."
              value={formState.freeText}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  freeText: event.target.value,
                }))
              }
            />
            <button
              type="button"
              className="primary-button"
              onClick={handleAddFreeText}
            >
              Add
            </button>
          </>
        )}
        {selectedInputType === 'multipleSelect' && (
          <>
            <fieldset className="form-fieldset">
              <legend className="form-label">Available skills</legend>
              {multiSelectOptions.map((option) => (
                <label key={option} className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={formState.multipleSelect.has(option)}
                    onChange={() => handleCheckboxChange(option)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </fieldset>
            <button
              type="button"
              className="primary-button"
              onClick={handleAddMultipleSelect}
            >
              Add
            </button>
          </>
        )}
        {selectedInputType === 'dropdownList' && (
          <>
            <label className="form-label" htmlFor="dropdownItemSelect">
              Needed items
            </label>
            <select
              id="dropdownItemSelect"
              className="form-select"
              value={formState.dropdown.item}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  dropdown: {
                    ...prev.dropdown,
                    item: event.target.value,
                  },
                }))
              }
            >
              <option value="">Select item</option>
              {dropdownItems.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <label className="form-label" htmlFor="dropdownExplanation">
              Explanation
            </label>
            <textarea
              id="dropdownExplanation"
              className="form-textarea"
              placeholder="Ex: I can donate 100 student chairs"
              value={formState.dropdown.explanation}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  dropdown: {
                    ...prev.dropdown,
                    explanation: event.target.value,
                  },
                }))
              }
            />
            <button
              type="button"
              className="primary-button"
              onClick={handleAddDropdown}
            >
              Add
            </button>
          </>
        )}
      </div>
    );
  };

  const handleAddNewClick = () => {
    if (!selectedInputType) {
      setFormError('Please choose an input type first.');
      setIsFormVisible(false);
      return;
    }
    setFormError('');
    setIsFormVisible(true);
  };

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
      
      // Call the success callback which will handle navigation
      if (onDeleteSuccess) {
        onDeleteSuccess(community.title || 'Community');
      }
    } catch (error) {
      setDeleteError(error.message || 'Failed to delete community. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleUpdateClick = () => {
    // Pre-fill form with existing values
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
          <div className="inputs-header">
            <h2>Community Inputs</h2>
          </div>
          <div className="inputs-layout">
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
                    <option value="Free text">Free text</option>
                    <option value="Multiple select">Multiple select</option>
                    <option value="Drop down list">Drop down list</option>
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
              </div>
              <div className="inputs-table-body">
                {sortedAndFilteredInputs.map((input) => (
                  <div className="inputs-table-row" key={input.id}>
                    <div className="cell created-by">{input.creator}</div>
                    <div className="cell type">{input.type}</div>
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
                  </div>
                ))}
                {!sortedAndFilteredInputs.length && (
                  <div className="empty-state">
                    <p>No community inputs found for the selected filters.</p>
                  </div>
                )}
              </div>
            </div>
            <div className="inputs-form-wrapper">
              <div className="input-type-selector">
                <label htmlFor="inputTypeSelect" className="form-label">
                  Input type
                </label>
                <div className="selector-row">
                  <select
                    id="inputTypeSelect"
                    className="form-select"
                    value={selectedInputType}
                    onChange={(event) => {
                      setSelectedInputType(event.target.value);
                      setIsFormVisible(false);
                      setFormError('');
                    }}
                  >
                    <option value="">Select input type</option>
                    {inputTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleAddNewClick}
                  >
                    Add New Community Input
                  </button>
                </div>
              </div>
              {renderInputForm()}
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
              <div>
                <dt>Details</dt>
                <dd>{detailsItem.details}</dd>
              </div>
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