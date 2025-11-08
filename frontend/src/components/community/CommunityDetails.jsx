import React, { useMemo, useState } from 'react';
import './CommunityDetails.css';

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

const CommunityDetails = ({ community }) => {
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

  const title = community?.title || 'Children in Van need a new school building';
  const description =
    community?.description ||
    'Children who lives Van Agarri need a new school building with new equipments. Their current building is very old and not secure for them. They also have hard time during winter because the current building does not have heater in classrooms. Most of them got sick during school terms and miss their classes. We need structural equipments, people who are familiar with constructional work, items that can be used in classrooms.';
  const communityOwner = community?.creator || 'esranzm';
  const createdAt = formatDate(
    community?.createdAt || '2025-10-21T09:00:00Z',
  );
  const commentCount = community?.commentCount ?? 10;
  const currentUser = community?.currentUser || 'currentUser';

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
    </div>
  );
};

export default CommunityDetails;