import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { ExternalLink, Eye, CheckCircle, XCircle } from "lucide-react";

const AdminDashboard = () => {
	// --- User State ---
	const [users, setUsers] = useState([]);
	const [loadingUsers, setLoadingUsers] = useState(true);
	const [suspendModal, setSuspendModal] = useState({ show: false, userId: null });
	const [suspendReason, setSuspendReason] = useState("");
	const [suspendDuration, setSuspendDuration] = useState("1d");

	// --- Report State ---
	const [reports, setReports] = useState([]);
	const [loadingReports, setLoadingReports] = useState(true);

	// --- Fetch Users ---
	const fetchUsers = async () => {
		setLoadingUsers(true);
		try {
			const res = await axiosInstance.get("/admin/users");
			const userList = Array.isArray(res.data) ? res.data : [];
			setUsers(userList);
		} catch (err) {
			console.error("Error fetching users", err);
			toast.error("Failed to load users");
			setUsers([]);
		} finally {
			setLoadingUsers(false);
		}
	};

	// --- Fetch Reports ---
	const fetchReports = async () => {
		setLoadingReports(true);
		try {
			const res = await axiosInstance.get("/admin/reports");
			setReports(Array.isArray(res.data) ? res.data : []);
		} catch (err) {
			console.error("Error fetching reports", err);
			toast.error("Failed to load reports");
			setReports([]);
		} finally {
			setLoadingReports(false);
		}
	};

	// --- Fetch Data on Mount ---
	useEffect(() => {
		fetchUsers();
		fetchReports();
	}, []);

	// --- Action Handlers (Users) ---
	const handleAction = async (userId, action, payload = {}) => {
		try {
            // This part is correct: it just opens the modal.
			if (action === "suspend") {
				setSuspendModal({ show: true, userId });
				return;
			}
            
            // All other actions (unsuspend, block, etc.) use this
			const url = `/admin/${action}/${userId}`;
			const method = action === 'delete' ? 'delete' : 'put';
			const res = await axiosInstance[method](url, payload);

			toast.success(res.data.message || `${action} success`);
			fetchUsers(); // Refetch users after action
		} catch (err) {
			console.error("Error in handleAction:", err);
			toast.error(err.response?.data?.message || "Action failed");
		}
	};

    // --- *** THIS FUNCTION IS NOW FIXED *** ---
	const confirmSuspend = async () => {
        if (!suspendReason) {
            toast.error("Please provide a reason for suspension.");
            return;
        }

        const payload = {
            reason: suspendReason,
            until: getFutureDate(suspendDuration)
        };
        const userId = suspendModal.userId;

        try {
            // Manually make the API call instead of using handleAction
            const res = await axiosInstance.put(`/admin/suspend/${userId}`, payload);
            
            toast.success(res.data.message || "User suspended successfully");
            
            fetchUsers(); // Refetch users to show new status
            
            // Close and reset modal
            setSuspendModal({ show: false, userId: null });
            setSuspendReason("");
            setSuspendDuration("1d");

        } catch (err) {
            console.error("Failed to suspend user:", err);
            toast.error(err.response?.data?.message || "Failed to suspend user");
        }
	};
    // --- *** END OF FIXED FUNCTION *** ---

	const getFutureDate = (durationStr) => { /* ... date calculation ... */
		const now = new Date(); const num = parseInt(durationStr); const unit = durationStr.replace(num, "");
		if (unit === "d" || unit === "") now.setDate(now.getDate() + num); else if (unit === "w") now.setDate(now.getDate() + num * 7); else if (unit === "m") now.setDate(now.getDate() + num * 30); return now.toISOString();
	};
	
    const handleDelete = async (userId) => { 
        // We can just call handleAction for delete, since it doesn't need a modal
        await handleAction(userId, 'delete'); 
    };

	// --- Action Handler (Reports) ---
	const handleReportStatus = async (reportId, newStatus) => {
		// This is a placeholder, as noted in your code.
		toast.info(`Updating report ${reportId} to ${newStatus}... (Backend needed)`);
		setReports(prev => prev.map(r => r._id === reportId ? { ...r, status: newStatus } : r));
	};

	return (
		<div className="h-screen pt-20 px-2 sm:px-4 bg-base-200 overflow-auto pb-10">
			<div className="max-w-7xl mx-auto bg-base-100 shadow-lg rounded-xl p-4 sm:p-8">
				<h1 className="text-2xl sm:text-4xl font-bold mb-6 text-center">Admin Dashboard</h1>

				{/* --- Users Table Section --- */}
				<section className="mb-12">
					<h2 className="text-xl sm:text-2xl font-semibold mb-4">User Management</h2>
					{loadingUsers ? (
						<div className="text-center text-lg"><span className="loading loading-spinner"></span> Loading users...</div>
					) : users.length === 0 ? (
						<div className="text-center text-red-500">No users found.</div>
					) : (
						<div className="overflow-x-auto">
							<table className="table w-full table-zebra table-sm sm:table-md">
								{/* Users Table Head */}
								<thead>
									<tr className="text-xs sm:text-sm text-center">
										<th>#</th><th>Name</th><th>Email</th><th>Status</th><th>Verified</th><th>Suspended</th><th>Blocked</th><th>Actions</th>
									</tr>
								</thead>
								{/* Users Table Body */}
								<tbody>
									{users.map((user, idx) => (
										<tr key={user._id} className="text-center text-xs sm:text-sm">
											<td>{idx + 1}</td>
											<td className="flex items-center gap-1 sm:gap-2 justify-center">
												<div className="avatar avatar-xs sm:avatar-sm mr-1">
												 <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full">
												  <img src={user.profilePic || '/default-avatar.png'} alt={user.nickname || user.username} />
												 </div>
												</div>
												{user.nickname || user.username}
											</td>
											<td className="truncate max-w-[100px] sm:max-w-xs">{user.email}</td>
											<td>{user.isOnline ? "🟢 Online" : "⚪ Offline"}</td>
											<td>{user.isVerified ? "✅" : "❌"}</td>
											<td>{user.isSuspended ? "⏸️" : "—"}</td>
											<td>{user.isBlocked ? "🚫" : "—"}</td>
											<td>
												<div className="flex flex-wrap justify-center gap-1">
													{/* User Action Buttons */}
													<button onClick={() => handleAction(user._id, user.isSuspended ? "unsuspend" : "suspend")} className="btn btn-warning btn-xs"> {user.isSuspended ? "Unsuspend" : "Suspend"} </button>
													<button onClick={() => handleAction(user._id, user.isBlocked ? "unblock" : "block")} className={`btn btn-xs ${user.isBlocked ? "btn-outline btn-neutral" : "btn-error"}`}> {user.isBlocked ? "Unblock" : "Block"} </button>
													<button onClick={() => handleAction(user._id, "toggleVerification")} className={`btn btn-xs ${user.isVerified ? "btn-outline btn-info" : "btn-success"}`}> {user.isVerified ? "Unverify" : "Verify"} </button>
													<button onClick={() => handleDelete(user._id)} className="btn btn-outline btn-error btn-xs"> Delete </button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>
				{/* --- End Users Table Section --- */}


				{/* --- Reports Table Section --- */}
				<section>
					<h2 className="text-xl sm:text-2xl font-semibold mb-4">Moderation Reports</h2>
					{loadingReports ? (
						<div className="text-center text-lg"><span className="loading loading-spinner"></span> Loading reports...</div>
					) : reports.length === 0 ? (
						<div className="text-center text-info">No pending reports found.</div>
					) : (
						<div className="overflow-x-auto">
							<table className="table w-full table-zebra table-sm sm:table-md">
								<thead>
									<tr className="text-xs sm:text-sm text-center">
										<th>Date</th>
										<th>Reporter</th>
										<th>Reported User</th>
										<th>Reason</th>
										<th>Screenshot</th>
										<th>Status</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{reports.map((report) => (
										<tr key={report._id} className="text-center text-xs sm:text-sm">
											<td>{new Date(report.createdAt).toLocaleString()}</td>
											<td>{report.reporter?.nickname || report.reporter?.username || 'N/A'}</td>
											<td>{report.reportedUser?.nickname || report.reportedUser?.username || 'N/A'}</td>
											<td>{report.reason}</td>
											<td>
												<a href={report.screenshot} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs">
													<ExternalLink size={14} /> View
												</a>
											</td>
											<td>
												<span className={`badge ${
													report.status === 'pending' ? 'badge-warning' :
													report.status === 'reviewed' ? 'badge-info' :
													report.status === 'action_taken' ? 'badge-success' :
													report.status === 'dismissed' ? 'badge-neutral' : ''
												}`}>
													{report.status}
												</span>
											</td>
											<td>
												{/* Placeholder Action Buttons for Reports */}
												<div className="flex flex-wrap justify-center gap-1">
													{report.status === 'pending' && (
														<button onClick={() => handleReportStatus(report._id, 'reviewed')} className="btn btn-info btn-xs"><Eye size={12}/> Review</button>
													)}
													{report.status === 'reviewed' && (
														<>
															<button onClick={() => handleReportStatus(report._id, 'action_taken')} className="btn btn-success btn-xs"><CheckCircle size={12}/> Action</button>
															<button onClick={() => handleReportStatus(report._id, 'dismissed')} className="btn btn-neutral btn-xs"><XCircle size={12}/> Dismiss</button>
														</>
													)}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>
				{/* --- End Reports Table Section --- */}

			</div>

			{/* Suspend Modal */}
			{suspendModal.show && (
				<div className="modal modal-open">
					<div className="modal-box">
						<h3 className="font-bold text-lg">Suspend User</h3>
						<div className="form-control">
							<label className="label">Reason for suspension</label>
							<textarea
								className="textarea textarea-bordered"
								value={suspendReason}
								onChange={(e) => setSuspendReason(e.target.value)}
								placeholder="Enter reason..."
							/>
							<label className="label">Duration</label>
							<select
								className="select select-bordered"
								value={suspendDuration}
								onChange={(e) => setSuspendDuration(e.target.value)}
							>
								<option value="1d">1 Day</option>
								<option value="7d">7 Days</option>
								<option value="30d">30 Days</option>
							</select>
						</div>
						<div className="modal-action">
							<button className="btn btn-error" onClick={confirmSuspend}>Suspend</button>
							<button className="btn" onClick={() => setSuspendModal({ show: false, userId: null })}>Cancel</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default AdminDashboard;
