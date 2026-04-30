"use client"
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
	HiOutlineBell as BellIcon,
	HiOutlineBars3 as MenuIcon,
	HiOutlineChevronDown as ChevronDownIcon,
	HiOutlineXMark as CloseIcon,
} from 'react-icons/hi2'
import { apiClient, ApiError } from '@/lib/apiClient'
import styles from './topnav.module.css'

export default function Topnav({
	user,
	isSidebarCollapsed = false,
	canToggleSidebar = true,
	onToggleSidebar,
	onLogout,
}) {
	const router = useRouter()
	const [currentUser, setCurrentUser] = useState(user || null)
	const [menuOpen, setMenuOpen] = useState(false)
	const [notificationsOpen, setNotificationsOpen] = useState(false)
	const [notifications, setNotifications] = useState([])
	const [unreadCount, setUnreadCount] = useState(0)
	const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
	const [showConfirm, setShowConfirm] = useState(false)
	const [logoutError, setLogoutError] = useState('')
	const [isLoggingOut, setIsLoggingOut] = useState(false)
	const visibleNotifications = useMemo(() => notifications.slice(0, 10), [notifications])

	useEffect(() => {
		setCurrentUser(user || null)
	}, [user])

	useEffect(() => {
		let isMounted = true

		const loadCurrentUser = async () => {
			try {
				const response = await apiClient.get('/auth/me')
				if (isMounted && response?.user) {
					setCurrentUser(response.user)
				}
			} catch {
				// Keep existing fallback label when current user cannot be loaded.
			}
		}

		loadCurrentUser()

		return () => {
			isMounted = false
		}
	}, [])

	const formatRole = (role) => {
		const normalized = String(role || '').trim().toLowerCase()
		if (!normalized) {
			return 'User'
		}

		if (normalized === 'super-admin' || normalized === 'super_admin' || normalized === 'superadmin') {
			return 'Super Admin'
		}

		return normalized
			.split(/[_\s-]+/)
			.filter(Boolean)
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ')
	}

	const roleLabel = formatRole(currentUser?.role)
	const isPresident = String(currentUser?.role || '').toLowerCase() === 'president'

	const initial = useMemo(() => {
		return roleLabel.charAt(0).toUpperCase() || 'U'
	}, [roleLabel])

	const displayName = roleLabel

	const openLogoutConfirm = () => {
		setNotificationsOpen(false)
		setMenuOpen(false)
		setShowConfirm(true)
	}

	const fetchNotifications = async () => {
		if (!isPresident) {
			setNotifications([])
			setUnreadCount(0)
			return
		}

		setIsLoadingNotifications(true)
		try {
			const response = await apiClient.get('/notifications', {
				query: { page: 1, limit: 10 },
			})

			setNotifications(Array.isArray(response?.data) ? response.data : [])
			setUnreadCount(Number(response?.meta?.unreadCount) || 0)
		} catch {
			setNotifications([])
			setUnreadCount(0)
		} finally {
			setIsLoadingNotifications(false)
		}
	}

	useEffect(() => {
		fetchNotifications()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isPresident])

	useEffect(() => {
		if (!isPresident) {
			return undefined
		}

		const timer = window.setInterval(() => {
			fetchNotifications()
		}, 30000)

		return () => window.clearInterval(timer)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isPresident])

	const handleToggleNotifications = async () => {
		setMenuOpen(false)
		setNotificationsOpen((prev) => !prev)

		if (!notificationsOpen) {
			await fetchNotifications()
		}
	}

	const markNotificationRead = async (notificationId) => {
		try {
			await apiClient.patch(`/notifications/${notificationId}/read`)
			setNotifications((prev) => prev.map((item) => {
				if (String(item._id) !== String(notificationId)) {
					return item
				}

				return {
					...item,
					read: true,
					read_at: new Date().toISOString(),
				}
			}))
			setUnreadCount((prev) => Math.max(prev - 1, 0))
		} catch {
			// Ignore read-state failures in the UI.
		}
	}

	const handleViewAllNotifications = () => {
		setNotificationsOpen(false)
		router.push('/notifications')
	}

	useEffect(() => {
		if (showConfirm) {
			setNotificationsOpen(false)
			setMenuOpen(false)
		}
	}, [showConfirm])

	const handleMarkAllRead = async () => {
		try {
			await apiClient.patch('/notifications/mark-all-read')
			setNotifications((prev) => prev.map((item) => ({ ...item, read: true, read_at: new Date().toISOString() })))
			setUnreadCount(0)
		} catch {
			// Ignore read-state failures in the UI.
		}
	}

	const handleConfirmLogout = async () => {
		setLogoutError('')
		setIsLoggingOut(true)

		try {
			if (onLogout) {
				await onLogout()
			} else {
				await apiClient.post('/auth/logout')
				router.push('/login')
				router.refresh()
			}
			setShowConfirm(false)
			setMenuOpen(false)
		} catch (error) {
			if (error instanceof ApiError) {
				setLogoutError(error.message)
			} else {
				setLogoutError('Unable to logout right now. Please try again.')
			}
		} finally {
			setIsLoggingOut(false)
		}
	}

	return (
		<>
			<header className={styles.topnav}>
				{canToggleSidebar ? (
					<button
						type="button"
						className={styles.collapseBtn}
						onClick={onToggleSidebar}
						aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
					>
						{isSidebarCollapsed ? (
							<MenuIcon className={styles.topIcon} aria-hidden="true" />
						) : (
							<CloseIcon className={styles.topIcon} aria-hidden="true" />
						)}
					</button>
				) : (
					<span className={styles.toggleSpacer} aria-hidden="true" />
				)}

				<div className={styles.right}>
					<div className={styles.notificationsWrap}>
						<button
							type="button"
							className={styles.iconBtn}
							aria-label="Notifications"
							onClick={handleToggleNotifications}
						>
							<BellIcon className={styles.topIcon} aria-hidden="true" />
							{isPresident && unreadCount > 0 ? (
								<span className={styles.notificationBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
							) : null}
						</button>

						{notificationsOpen && isPresident ? (
							<div className={styles.notificationsMenu} role="menu" aria-label="President notifications">
								<div className={styles.notificationsHeader}>
									<span className={styles.notificationsTitle}>Notifications</span>
									<button
										type="button"
										className={`${styles.secondaryButton}`}
										onClick={handleMarkAllRead}
									>
										Mark all read
									</button>
								</div>
								<div className={styles.notificationsBody}>
									{isLoadingNotifications ? (
										<p className={styles.notificationEmpty}>Loading notifications...</p>
									) : visibleNotifications.length === 0 ? (
										<p className={styles.notificationEmpty}>No officer activity notifications yet.</p>
									) : (
										<ul className={styles.notificationList}>
											{visibleNotifications.map((item) => (
												<li key={item._id}>
													<button
														type="button"
														className={`${styles.notificationItem} ${item.read ? styles.notificationRead : ''}`}
														onClick={() => markNotificationRead(item._id)}
													>
														<span className={styles.notificationTitle}>{item.title}</span>
														<span className={styles.notificationMessage}>{item.message}</span>
													</button>
												</li>
											))}
										</ul>
									)}
								</div>
								<div className={styles.notificationsFooter}>
									<button
										type="button"
										className={styles.notificationsLink}
										onClick={handleViewAllNotifications}
									>
										View all notifications
									</button>
								</div>
							</div>
						) : null}
					</div>

					<div className={styles.userMenuWrap}>
						<button
							type="button"
							className={styles.userMenuBtn}
							onClick={() => {
								setNotificationsOpen(false)
								setMenuOpen((prev) => !prev)
							}}
							aria-expanded={menuOpen}
							aria-haspopup="menu"
						>
							<span className={styles.avatarCircle}>{initial}</span>
							<span className={styles.userName}>{displayName}</span>
							<ChevronDownIcon className={styles.chevron} aria-hidden="true" />
						</button>

						{menuOpen && (
							<div className={styles.menu} role="menu">
								<button
									type="button"
									className={styles.menuItem}
									onClick={openLogoutConfirm}
								>
									Logout
								</button>
							</div>
						)}
					</div>
				</div>
			</header>

			{showConfirm && (
				<div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Logout confirmation">
					<div className={styles.modal}>
						<h3 className={styles.modalTitle}>Confirm Logout</h3>
						<p className={styles.modalText}>Are you sure you want to logout?</p>
						{logoutError && <p className={styles.errorText}>{logoutError}</p>}

						<div className={styles.modalActions}>
							<button
								type="button"
								className={styles.cancelBtn}
								onClick={() => setShowConfirm(false)}
								disabled={isLoggingOut}
							>
								Cancel
							</button>
							<button
								type="button"
								className={styles.confirmBtn}
								onClick={handleConfirmLogout}
								disabled={isLoggingOut}
							>
								{isLoggingOut ? 'Logging out...' : 'Yes, Logout'}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	)
}
