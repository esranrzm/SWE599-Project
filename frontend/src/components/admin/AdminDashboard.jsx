import React, { useState, useEffect, useMemo } from 'react';
import './AdminDashboard.css';
import { getAdminStats, getAllCommunitiesAdmin, getAllUsersAdmin, deleteUserAdmin, getAllTabsAdmin, deleteCommunity } from '../../services/api';

const formatDate = (isoString) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString || '-';
  }
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const AdminDashboard = ({ onOpenCommunity, onLogout, onNavigateToHome }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ total_communities: 0, total_users: 0, total_tabs: 0 });
  const [communities, setCommunities] = useState([]);
  const [users, setUsers] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteCommunityDialog, setShowDeleteCommunityDialog] = useState(false);
  const [communityToDelete, setCommunityToDelete] = useState(null);
  const [isDeletingCommunity, setIsDeletingCommunity] = useState(false);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [sortConfig, setSortConfig] = useState({ column: 'created_at', direction: 'desc' });

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadStats();
    } else if (activeTab === 'communities') {
      loadCommunities();
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'tabs') {
      loadTabs();
    }
  }, [activeTab]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminStats();
      setStats(data);
    } catch (err) {
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const loadCommunities = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllCommunitiesAdmin();
      setCommunities(data);
    } catch (err) {
      setError(err.message || 'Failed to load communities');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllUsersAdmin();
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadTabs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllTabsAdmin();
      setTabs(data);
    } catch (err) {
      setError(err.message || 'Failed to load tabs');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCommunity = (community) => {
    setCommunityToDelete(community);
    setShowDeleteCommunityDialog(true);
  };

  const handleConfirmDeleteCommunity = async () => {
    if (!communityToDelete) return;

    setIsDeletingCommunity(true);
    try {
      await deleteCommunity(communityToDelete.id);
      setShowDeleteCommunityDialog(false);
      setCommunityToDelete(null);
      loadCommunities(); // Refresh list
    } catch (err) {
      setError(err.message || 'Failed to delete community');
    } finally {
      setIsDeletingCommunity(false);
    }
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setShowDeleteUserDialog(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeletingUser(true);
    try {
      await deleteUserAdmin(userToDelete.id);
      setShowDeleteUserDialog(false);
      setUserToDelete(null);
      loadUsers(); // Refresh list
      loadStats(); // Refresh stats
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleViewCommunity = (community) => {
    const mappedCommunity = {
      id: community.id,
      title: community.title,
      description: community.description,
      creator: community.creator_name,
      creator_id: community.creator_id,
      creator_username: community.creator_username,
      creator_email: community.creator_email,
      createdAt: community.created_at,
      updatedAt: community.updated_at,
      tabs: community.tabs || [],
    };
    onOpenCommunity(mappedCommunity);
  };

  const handleViewTab = async (tab) => {
    // Load communities if not already loaded
    if (communities.length === 0) {
      try {
        const data = await getAllCommunitiesAdmin();
        setCommunities(data);
        const community = data.find(c => c.id === tab.community_id);
        if (community) {
          const mappedCommunity = {
            id: community.id,
            title: community.title,
            description: community.description,
            creator: community.creator_name,
            creator_id: community.creator_id,
            creator_username: community.creator_username,
            creator_email: community.creator_email,
            createdAt: community.created_at,
            updatedAt: community.updated_at,
            tabs: community.tabs || [],
          };
          onOpenCommunity(mappedCommunity, tab.id);
        }
      } catch (err) {
        setError(err.message || 'Failed to load community');
      }
    } else {
      const community = communities.find(c => c.id === tab.community_id);
      if (community) {
        const mappedCommunity = {
          id: community.id,
          title: community.title,
          description: community.description,
          creator: community.creator_name,
          creator_id: community.creator_id,
          creator_username: community.creator_username,
          creator_email: community.creator_email,
          createdAt: community.created_at,
          updatedAt: community.updated_at,
          tabs: community.tabs || [],
        };
        onOpenCommunity(mappedCommunity, tab.id);
      }
    }
  };

  const handleSort = (column) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        return {
          column,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      const defaultDirection = column === 'created_at' ? 'desc' : 'asc';
      return { column, direction: defaultDirection };
    });
  };

  const getSortIndicator = (column) => {
    if (sortConfig.column !== column) return '';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const sortedCommunities = useMemo(() => {
    if (!communities.length) return [];
    
    const sorted = [...communities].sort((a, b) => {
      if (sortConfig.column === 'created_at') {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortConfig.column === 'creator') {
        const nameA = (a.creator_username || a.creator_name || '').toLowerCase();
        const nameB = (b.creator_username || b.creator_name || '').toLowerCase();
        if (nameA === nameB) return 0;
        if (sortConfig.direction === 'asc') {
          return nameA > nameB ? 1 : -1;
        } else {
          return nameA < nameB ? 1 : -1;
        }
      }
      return 0;
    });
    
    return sorted;
  }, [communities, sortConfig]);

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
      </div>
      <div className="admin-content">
        <div className="admin-sidebar">
          <div className="sidebar-title">Community Hub</div>
          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Dashboard
            </button>
            <button
              className={`nav-item ${activeTab === 'communities' ? 'active' : ''}`}
              onClick={() => setActiveTab('communities')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              All communities
            </button>
            <button
              className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Community Users
            </button>
            <button
              className={`nav-item ${activeTab === 'tabs' ? 'active' : ''}`}
              onClick={() => setActiveTab('tabs')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
              Community Tabs
            </button>
            <button className="nav-item" onClick={onLogout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </nav>
        </div>
        <div className="admin-main">
          {error && (
            <div className="error-message" style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fee',
              color: '#c33',
              borderRadius: '8px',
              marginBottom: '1rem',
              border: '1px solid #fcc'
            }}>
              {error}
            </div>
          )}
          {loading && activeTab === 'dashboard' && <div>Loading stats...</div>}
          {loading && activeTab === 'communities' && <div>Loading communities...</div>}
          {loading && activeTab === 'users' && <div>Loading users...</div>}
          {loading && activeTab === 'tabs' && <div>Loading tabs...</div>}
          
          {activeTab === 'dashboard' && !loading && (
            <div className="dashboard-content">
              <h2>Dashboard</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{stats.total_communities}</div>
                  <div className="stat-label">Total Communities</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.total_users}</div>
                  <div className="stat-label">Total Users</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.total_tabs}</div>
                  <div className="stat-label">Total Tabs</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'communities' && !loading && (
            <div className="communities-content">
              <h2>Community List</h2>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>Title</th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('creator')}
                      style={{ cursor: 'pointer', textAlign: 'center' }}
                    >
                      Community owner {getSortIndicator('creator')}
                    </th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('created_at')}
                      style={{ cursor: 'pointer', textAlign: 'center' }}
                    >
                      Created At {getSortIndicator('created_at')}
                    </th>
                    <th style={{ textAlign: 'center' }}>Number of tabs</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCommunities.map((community) => (
                    <tr key={community.id}>
                      <td className="title-cell" style={{ textAlign: 'center' }} title={community.title}>{community.title}</td>
                      <td style={{ textAlign: 'center' }}>{community.creator_username || community.creator_name}</td>
                      <td style={{ textAlign: 'center' }}>{formatDate(community.created_at)}</td>
                      <td style={{ textAlign: 'center' }}>{community.tabs ? community.tabs.length : 0}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="action-button delete-button"
                          onClick={() => handleDeleteCommunity(community)}
                          title="Delete"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                        <button
                          className="action-button view-button"
                          onClick={() => handleViewCommunity(community)}
                          title="View"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'users' && !loading && (
            <div className="users-content">
              <h2>User List</h2>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Surname</th>
                    <th>Username</th>
                    <th>Date of Birth</th>
                    <th>Occupation</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    let dateOfBirth = null;
                    if (user.date_of_birth) {
                      dateOfBirth = String(user.date_of_birth).split('T')[0];
                    }
                    return (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.surname}</td>
                        <td>{user.username}</td>
                        <td>{dateOfBirth || '-'}</td>
                        <td>{user.profession || '-'}</td>
                        <td>
                          <button
                            className="action-button delete-button"
                            onClick={() => handleDeleteUser(user)}
                            title="Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'tabs' && !loading && (
            <div className="tabs-content">
              <h2>Tab List</h2>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tab Name</th>
                    <th>Community ID</th>
                    <th>Number of Inputs</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tabs.map((tab) => (
                    <tr key={tab.id}>
                      <td>{tab.name}</td>
                      <td>{tab.community_id}</td>
                      <td>{tab.input_count}</td>
                      <td>
                        <button
                          className="action-button view-button"
                          onClick={() => handleViewTab(tab)}
                          title="View Tab"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Community Dialog */}
      {showDeleteCommunityDialog && (
        <div className="dialog-backdrop" onClick={() => !isDeletingCommunity && setShowDeleteCommunityDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Community</h3>
            <p>Are you sure you want to delete the community "{communityToDelete?.title}"?</p>
            <p style={{ color: '#dc2626', marginTop: '0.5rem' }}>This action cannot be undone.</p>
            <div className="dialog-actions">
              <button
                className="dialog-button cancel"
                onClick={() => setShowDeleteCommunityDialog(false)}
                disabled={isDeletingCommunity}
              >
                Cancel
              </button>
              <button
                className="dialog-button delete"
                onClick={handleConfirmDeleteCommunity}
                disabled={isDeletingCommunity}
              >
                {isDeletingCommunity ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Dialog */}
      {showDeleteUserDialog && (
        <div className="dialog-backdrop" onClick={() => !isDeletingUser && setShowDeleteUserDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete User</h3>
            <p>Are you sure you want to delete the user "{userToDelete?.username}"?</p>
            <p style={{ color: '#dc2626', marginTop: '0.5rem' }}>This action cannot be undone. Communities and inputs will not be deleted.</p>
            <div className="dialog-actions">
              <button
                className="dialog-button cancel"
                onClick={() => setShowDeleteUserDialog(false)}
                disabled={isDeletingUser}
              >
                Cancel
              </button>
              <button
                className="dialog-button delete"
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingUser}
              >
                {isDeletingUser ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

