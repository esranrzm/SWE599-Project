import React, { useState, useEffect } from 'react';
import avatarDefault from '../../assets/avatar-default.svg';
import { getCurrentUser, getToken, updateUser, deleteUser, updatePassword } from '../../services/api';
import './Profile.css';

const Profile = ({ user: initialUser, onEditProfile, onUpdatePassword, onDeleteAccount, onSaveProfile, onPasswordUpdated }) => {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [pwdData, setPwdData] = useState({ current: '', next: '', confirm: '' });
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });
  const [pwdError, setPwdError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = getToken();
        
        if (!token) {
          setError('No authentication token found. Please login again.');
          setLoading(false);
          return;
        }

        console.log('Fetching user data from /api/auth/me...');
        const userData = await getCurrentUser();
        console.log('Fetched user data:', userData);
        setUser(userData);
        setError(null);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err.message || 'Failed to load user profile');
        if (initialUser) {
          setUser(initialUser);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading profile...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          <div style={{ textAlign: 'center', padding: '2rem', color: '#c33' }}>
            <p>Error loading profile: {error}</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Please try refreshing the page or login again.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-card">No user found.</div>
      </div>
    );
  }

  const { email, name, surname, username, profession, dateOfBirth } = user;

  console.log('Profile component - user object:', user);
  console.log('Profile component - dateOfBirth value:', dateOfBirth, 'type:', typeof dateOfBirth);

  const displayPhoto = avatarDefault;

  const formatDateOfBirth = (dateStr) => {
    console.log('formatDateOfBirth received:', dateStr, 'type:', typeof dateStr);
    if (!dateStr) {
      console.log('dateStr is falsy, returning N/A');
      return 'N/A';
    }
    try {
      const dateParts = String(dateStr).split('-');
      if (dateParts.length === 3) {
        const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        }
      }
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
      console.warn('Could not parse date:', dateStr);
      return String(dateStr);
    } catch (e) {
      console.error('Date formatting error:', e, 'dateStr:', dateStr);
      return String(dateStr) || 'N/A';
    }
  };

  const handleEditOpen = () => {
    setEditData({
      email: email || '',
      name: name || '',
      surname: surname || '',
      username: username || '',
      profession: profession || '',
    });
    setUpdateError(null);
    setEditOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditCancel = () => {
    setEditOpen(false);
    setUpdateError(null);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    
    if (!editData.email || !editData.email.trim()) {
      setUpdateError('Email cannot be empty.');
      return;
    }
    if (!editData.name || !editData.name.trim()) {
      setUpdateError('Name cannot be empty.');
      return;
    }
    if (!editData.surname || !editData.surname.trim()) {
      setUpdateError('Surname cannot be empty.');
      return;
    }
    if (!editData.username || !editData.username.trim()) {
      setUpdateError('Username cannot be empty.');
      return;
    }
    if (!editData.profession || !editData.profession.trim()) {
      setUpdateError('Profession cannot be empty.');
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const updatedUser = await updateUser({
        email: editData.email.trim(),
        name: editData.name.trim(),
        surname: editData.surname.trim(),
        username: editData.username.trim(),
        profession: editData.profession.trim(),
        photo_url: null
      });

      setUser(updatedUser);
      
      if (onSaveProfile) {
        onSaveProfile(updatedUser);
      }

      setEditOpen(false);
    } catch (error) {
      setUpdateError(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const openPasswordModal = () => {
    setPwdData({ current: '', next: '', confirm: '' });
    setShowPwd({ current: false, next: false, confirm: false });
    setPwdError('');
    setPasswordOpen(true);
  };

  const handlePwdChange = (e) => {
    const { name, value } = e.target;
    setPwdData((prev) => ({ ...prev, [name]: value }));
    if (name === 'next' || name === 'confirm') {
      setPwdError('');
    }
  };

  const handlePwdSave = async (e) => {
    e.preventDefault();
    
    if (!pwdData.current || !pwdData.current.trim()) {
      setPwdError('Current password cannot be empty.');
      return;
    }
    if (!pwdData.next || !pwdData.next.trim()) {
      setPwdError('New password cannot be empty.');
      return;
    }
    if (pwdData.next.length < 6) {
      setPwdError('New password must be at least 6 characters long.');
      return;
    }
    if (pwdData.next !== pwdData.confirm) {
      setPwdError('New password and confirmation do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    setPwdError('');

    try {
      await updatePassword(pwdData.current, pwdData.next);
      
      setPwdData({ current: '', next: '', confirm: '' });
      setShowPwd({ current: false, next: false, confirm: false });
      setPasswordOpen(false);
      
      if (onPasswordUpdated) {
        onPasswordUpdated();
      }
    } catch (error) {
      setPwdError(error.message || 'Failed to update password. Please try again.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteOpen(true);
    setDeleteError(null);
  };
  
  const handleDeleteCancel = () => {
    setDeleteOpen(false);
    setDeleteError(null);
  };
  
  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteUser();
      
      if (onDeleteAccount) {
        onDeleteAccount();
      }
    } catch (error) {
      setDeleteError(error.message || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-photo-box">
          <img src={displayPhoto} alt="Profile" className="profile-photo" />
        </div>
        <div className="profile-details">
          <div className="profile-row"><b>Full Name:</b> {name} {surname}</div>
          <div className="profile-row"><b>Email:</b>&nbsp;{email}</div>
          <div className="profile-row"><b>Username:</b>&nbsp;{username}</div>
          <div className="profile-row"><b>Profession:</b>&nbsp;{profession}</div>
          <div className="profile-row"><b>Date of Birth:</b>&nbsp;{formatDateOfBirth(dateOfBirth)}</div>
        </div>
        <div className="profile-actions">
          <button className="profile-btn edit-btn" onClick={handleEditOpen}>Edit Profile</button>
          <button className="profile-btn password-btn" onClick={openPasswordModal}>Update Password</button>
          <button className="profile-btn delete-btn" onClick={openDeleteModal}>Delete Account</button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true">
            <h2 className="modal-title">Edit Profile</h2>
            <form onSubmit={handleEditSave} className="modal-form">
              <div className="form-row">
                <label>Name
                  <input type="text" name="name" value={editData.name || ''} onChange={handleEditChange} disabled={isUpdating} required />
                </label>
              </div>
              <div className="form-row">
                <label>Surname
                  <input type="text" name="surname" value={editData.surname || ''} onChange={handleEditChange} disabled={isUpdating} required />
                </label>
              </div>
              <div className="form-row">
                <label>Email
                  <input type="email" name="email" value={editData.email || ''} onChange={handleEditChange} disabled={isUpdating} required />
                </label>
              </div>
              <div className="form-row">
                <label>Username
                  <input type="text" name="username" value={editData.username || ''} onChange={handleEditChange} disabled={isUpdating} required />
                </label>
              </div>
              <div className="form-row">
                <label>Profession
                  <input type="text" name="profession" value={editData.profession || ''} onChange={handleEditChange} disabled={isUpdating} required />
                </label>
              </div>
              {updateError && (
                <div className="error-text" role="alert" style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#fee',
                  color: '#c33',
                  borderRadius: '4px',
                  border: '1px solid #fcc'
                }}>
                  {updateError}
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="modal-btn cancel-btn gray-btn" onClick={handleEditCancel} disabled={isUpdating}>Cancel</button>
                <button type="submit" className="modal-btn save-btn" disabled={isUpdating || !editData.email?.trim() || !editData.name?.trim() || !editData.surname?.trim() || !editData.username?.trim() || !editData.profession?.trim()}>
                  {isUpdating ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-blur"></div>
        </div>
      )}

      {/* Update Password Modal */}
      {passwordOpen && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true">
            <h2 className="modal-title">Update Password</h2>
            <form onSubmit={handlePwdSave} className="modal-form">
              <div className="form-row">
                <label>Current Password</label>
                <div className="pwd-input-container">
                  <input type={showPwd.current ? 'text' : 'password'} name="current" value={pwdData.current} onChange={handlePwdChange} className="pwd-input" placeholder="********" />
                  <button type="button" className="pwd-toggle" aria-label="Toggle current password" onClick={() => setShowPwd((p)=>({ ...p, current: !p.current }))}>
                    {showPwd.current ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.018-2.876 2.997-5.243 5.5-6.74" /><path d="M1 1l22 22" /><path d="M10.58 10.58a2 2 0 0 0 2.84 2.84" /><path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8-.62 1.75-1.62 3.3-2.86 4.57" /></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="form-row">
                <label>New Password</label>
                <div className="pwd-input-container">
                  <input type={showPwd.next ? 'text' : 'password'} name="next" value={pwdData.next} onChange={handlePwdChange} className="pwd-input" placeholder="********" />
                  <button type="button" className="pwd-toggle" aria-label="Toggle new password" onClick={() => setShowPwd((p)=>({ ...p, next: !p.next }))}>
                    {showPwd.next ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.018-2.876 2.997-5.243 5.5-6.74" /><path d="M1 1l22 22" /><path d="M10.58 10.58a2 2 0 0 0 2.84 2.84" /><path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8-.62 1.75-1.62 3.3-2.86 4.57" /></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="form-row">
                <label>Confirm New Password</label>
                <div className="pwd-input-container">
                  <input type={showPwd.confirm ? 'text' : 'password'} name="confirm" value={pwdData.confirm} onChange={handlePwdChange} className="pwd-input" placeholder="********" />
                  <button type="button" className="pwd-toggle" aria-label="Toggle confirm password" onClick={() => setShowPwd((p)=>({ ...p, confirm: !p.confirm }))}>
                    {showPwd.confirm ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.018-2.876 2.997-5.243 5.5-6.74" /><path d="M1 1l22 22" /><path d="M10.58 10.58a2 2 0 0 0 2.84 2.84" /><path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8-.62 1.75-1.62 3.3-2.86 4.57" /></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
              </div>
              {pwdError && <div className="error-text" role="alert">{pwdError}</div>}
              <div className="modal-actions">
                <button type="button" className="modal-btn cancel-btn gray-btn" onClick={() => {
                  setPasswordOpen(false);
                  setPwdData({ current: '', next: '', confirm: '' });
                  setPwdError('');
                  setShowPwd({ current: false, next: false, confirm: false });
                }} disabled={isUpdatingPassword}>Cancel</button>
                <button type="submit" className="modal-btn save-btn" disabled={isUpdatingPassword || !pwdData.current || !pwdData.next || !pwdData.confirm || pwdData.next.length < 6 || pwdData.next !== pwdData.confirm}>
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-blur"></div>
        </div>
      )}

      {/* Delete Account Modal */}
      {deleteOpen && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true">
            <h2 className="modal-title">Delete Account</h2>
            <p>Are you sure you want to delete your account? This action cannot be undone.</p>
            <p style={{ color: '#dc2626', marginTop: '0.5rem', fontWeight: '500' }}>
              All your data will be permanently deleted.
            </p>
            {deleteError && (
              <div className="error-text" role="alert" style={{
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
            <div className="modal-actions">
              <button type="button" className="modal-btn cancel-btn gray-btn" onClick={handleDeleteCancel} disabled={isDeleting}>Cancel</button>
              <button type="button" className="modal-btn danger-btn" onClick={handleDeleteConfirm} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
          <div className="modal-blur"></div>
        </div>
      )}
    </div>
  );
};

export default Profile;

