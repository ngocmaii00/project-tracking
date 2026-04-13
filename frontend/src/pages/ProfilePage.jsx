import { useState } from "react";
import { User, Mail, Shield, Camera, Save, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import useStore from "../store/useStore";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { user, updateProfile } = useStore();
  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({ name, avatar });
      toast.success("Cập nhật thông tin thành công!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page-container">
      <div className="profile-header">
        <Link to="/dashboard" className="back-link">
          <ArrowLeft size={20} />
          <span>Quay lại</span>
        </Link>
        <h1>Thông tin cá nhân</h1>
      </div>

      <div className="profile-card glass">
        <div className="profile-avatar-section">
          <div
            className="profile-avatar-large"
            style={{
              background: `hsl(${user?.name?.charCodeAt(0) * 40 || 0}, 60%, 40%)`,
            }}
          >
            {avatar ? <img src={avatar} alt="Avatar" /> : user?.name?.[0]}
            <label className="avatar-upload-btn">
              <Camera size={16} />
              <input
                type="text"
                placeholder="Dán URL ảnh đại diện..."
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
              />
            </label>
          </div>
          <div className="profile-main-info">
            <h2>{user?.name}</h2>
            <p>{user?.role?.replace("_", " ").toUpperCase()}</p>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="profile-form">
          <div className="form-group">
            <label>
              <User size={16} /> Họ và tên
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên của bạn"
              required
            />
          </div>

          <div className="form-group disabled">
            <label>
              <Mail size={16} /> Email (Không thể thay đổi)
            </label>
            <input type="email" value={user?.email} disabled />
          </div>

          <div className="form-group disabled">
            <label>
              <Shield size={16} /> Vai trò
            </label>
            <input
              type="text"
              value={user?.role?.replace("_", " ")}
              disabled
              style={{ textTransform: "capitalize" }}
            />
          </div>

          <div className="form-group">
            <label>
              <Camera size={16} /> URL Ảnh đại diện
            </label>
            <input
              type="text"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={18} />
            {loading ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .profile-page-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          animation: fadeIn 0.5s ease-out;
        }
        .profile-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
        }
        .profile-header h1 {
          font-size: 24px;
          font-weight: 700;
          color: white;
          margin: 0;
        }
        .back-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s;
        }
        .back-link:hover {
          color: var(--primary);
        }
        .profile-card {
          padding: 40px;
          border-radius: 20px;
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 40px;
        }
        .profile-avatar-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .profile-avatar-large {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 60px;
          font-weight: 700;
          color: white;
          position: relative;
          margin-bottom: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          overflow: hidden;
        }
        .profile-avatar-large img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .avatar-upload-btn {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40px;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .profile-avatar-large:hover .avatar-upload-btn {
          opacity: 1;
        }
        .avatar-upload-btn input {
          display: none;
        }
        .profile-main-info h2 {
          font-size: 20px;
          margin: 0;
          color: white;
        }
        .profile-main-info p {
          font-size: 12px;
          color: var(--primary);
          letter-spacing: 1px;
          font-weight: 600;
          margin-top: 5px;
        }
        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .form-group label {
          font-size: 13px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .form-group input {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 12px 16px;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        .form-group input:focus {
          border-color: var(--primary);
          outline: none;
        }
        .form-group.disabled input {
          opacity: 0.5;
          cursor: not-allowed;
          background: transparent;
        }
        .btn-primary {
          background: var(--primary);
          color: white;
          padding: 14px;
          border-radius: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: none;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
          margin-top: 10px;
        }
        .btn-primary:hover {
          background: #4f46e5;
          transform: translateY(-2px);
        }
        .btn-primary:active {
          transform: translateY(0);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 600px) {
          .profile-card {
            grid-template-columns: 1fr;
            padding: 20px;
          }
        }
      ` }} />
    </div>
  );
}
