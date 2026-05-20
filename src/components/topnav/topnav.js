"use client"
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
	HiOutlineBell as BellIcon,
	HiOutlineBars3 as MenuIcon,
	HiOutlineXMark as CloseIcon,
} from 'react-icons/hi2'
import { apiClient } from '@/lib/apiClient'
import styles from './topnav.module.css'

export default function Topnav({
	user,
	isSidebarCollapsed = false,
	canToggleSidebar = true,
	onToggleSidebar,
}) {
	const router = useRouter()
	const [currentUser, setCurrentUser] = useState(user || null)
	const [notificationsOpen, setNotificationsOpen] = useState(false)
	const [notifications, setNotifications] = useState([])
	const [unreadCount, setUnreadCount] = useState(0)
	const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
	const visibleNotifications = useMemo(() => notifications.slice(0, 10), [notifications])

	useEffect(() => {
		setCurrentUser(user || null)
	}, [user])

	useEffect(() => {
		let isMounted = true

		const loadCurrentUser = async () => {
			try {
				if (!user) {
					const response = await apiClient.get('/auth/me')
					if (isMounted && response?.user) {
						setCurrentUser(response.user)
					}
				}
			} catch {
				// Keep existing fallback
			}
		}

		loadCurrentUser()

		return () => {
			isMounted = false
		}
	}, [user])

	const isPresident = String(currentUser?.role || '').toLowerCase() === 'president'

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

	const handleMarkAllRead = async () => {
		try {
			await apiClient.patch('/notifications/mark-all-read')
			setNotifications((prev) => prev.map((item) => ({ ...item, read: true, read_at: new Date().toISOString() })))
			setUnreadCount(0)
		} catch {
			// Ignore read-state failures in the UI.
		}
	}

	return (
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

			<div className={styles.brandCenter}>
				<Image
					src="/images/HOA_Logo.png"
					alt="HOA Logo"
					width={25}
					height={25}
					className={styles.logo}
				/>
				<span className={styles.brand}>OneHOA</span>
			</div>

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
			</div>
		</header>
	)
}
