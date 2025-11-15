import React, { useState, useEffect } from 'react';
import avatarDefault from '../../assets/avatar-default.svg';
import { getCurrentUser, getToken } from '../../services/api';
import './Profile.css';

const Profile = ({ user: initialUser, onEditProfile, onUpdatePassword, onDeleteAccount, onChangePhoto, onSaveProfile }) => {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [pwdData, setPwdData] = useState({ current: '', next: '', confirm: '' });
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });
  const [pwdError, setPwdError] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);

  // Fetch user data from API on component mount
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

        console.log('Fetching user data from /api/auth/me...'); // Debug log
        const userData = await getCurrentUser();
        console.log('Fetched user data:', userData); // Debug log
        setUser(userData);
        setError(null);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err.message || 'Failed to load user profile');
        // Fallback to initialUser if API call fails
        if (initialUser) {
          setUser(initialUser);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []); // Empty dependency array - fetch once on mount

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

  const { photo, photoUrl, photoPreview: initialPhotoPreview, email, name, surname, username, profession, dateOfBirth } = user;

  // Debug: Log the user object to see what we have
  console.log('Profile component - user object:', user);
  console.log('Profile component - dateOfBirth value:', dateOfBirth, 'type:', typeof dateOfBirth);

  // Handle photo display - prioritize photoUrl from API, then photoPreview, then default
  let displayPhoto = photoUrl || initialPhotoPreview || photoPreview;
  if (!displayPhoto && typeof photo === 'string' && photo.startsWith('data:')) displayPhoto = photo;
  if (!displayPhoto) displayPhoto = avatarDefault;

  // Format date of birth for display
  const formatDateOfBirth = (dateStr) => {
    console.log('formatDateOfBirth received:', dateStr, 'type:', typeof dateStr); // Debug
    if (!dateStr) {
      console.log('dateStr is falsy, returning N/A');
      return 'N/A';
    }
    try {
      // Handle YYYY-MM-DD format (most common from API)
      // Create date using date string directly - this handles YYYY-MM-DD format correctly
      const dateParts = String(dateStr).split('-');
      if (dateParts.length === 3) {
        // YYYY-MM-DD format
        const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]); // Month is 0-indexed
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        }
      }
      // Fallback: try parsing as-is
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
      // If all parsing fails, return the raw string
      console.warn('Could not parse date:', dateStr);
      return String(dateStr);
    } catch (e) {
      console.error('Date formatting error:', e, 'dateStr:', dateStr);
      return String(dateStr) || 'N/A';
    }
  };

  const handleEditOpen = () => {
    setEditData({
      email,
      username,
      profession,
      photo: photo || null,
      photoPreview: initialPhotoPreview || '',
    });
    setPhotoPreview(initialPhotoPreview || '');
    setEditOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'photo' && files && files[0]) {
      const file = files[0];
      setEditData((prev) => ({ ...prev, photo: file }));
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
      return;
    }
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditCancel = () => setEditOpen(false);

  const handleEditSave = (e) => {
    e.preventDefault();
    onSaveProfile && onSaveProfile({
      ...user,
      ...editData,
      photoPreview: photoPreview || initialPhotoPreview || '',
    });
    setEditOpen(false);
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

  const handlePwdSave = (e) => {
    e.preventDefault();
    if (pwdData.next !== pwdData.confirm) {
      setPwdError('New password and confirmation do not match.');
      return;
    }
    alert('Password updated successfully');
    setPasswordOpen(false);
  };

  const openDeleteModal = () => setDeleteOpen(true);
  const handleDeleteCancel = () => setDeleteOpen(false);
  const handleDeleteConfirm = () => {
    setDeleteOpen(false);
    onDeleteAccount && onDeleteAccount();
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
                <label>Profile Photo
                  <input type="file" name="photo" accept="image/*" onChange={handleEditChange} />
                </label>
                <img src={photoPreview || avatarDefault} alt="Preview" className="profile-photo modal-photo-preview" />
              </div>
              <div className="form-row">
                <label>Email
                  <input type="email" name="email" value={editData.email} onChange={handleEditChange} />
                </label>
              </div>
              <div className="form-row">
                <label>Username
                  <input type="text" name="username" value={editData.username} onChange={handleEditChange} />
                </label>
              </div>
              <div className="form-row">
                <label>Profession
                  <input type="text" name="profession" value={editData.profession} onChange={handleEditChange} />
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-btn cancel-btn gray-btn" onClick={handleEditCancel}>Cancel</button>
                <button type="submit" className="modal-btn save-btn">Save</button>
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
                <button type="button" className="modal-btn cancel-btn gray-btn" onClick={() => setPasswordOpen(false)}>Cancel</button>
                <button type="submit" className="modal-btn save-btn">Save</button>
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
            <h2 className="modal-title">Delete account</h2>
            <p>Are you sure you want to delete your account? This action cannot be taken back.</p>
            <div className="modal-actions">
              <button type="button" className="modal-btn cancel-btn gray-btn" onClick={handleDeleteCancel}>Cancel</button>
              <button type="button" className="modal-btn danger-btn" onClick={handleDeleteConfirm}>Delete</button>
            </div>
          </div>
          <div className="modal-blur"></div>
        </div>
      )}
    </div>
  );
};

export default Profile;

