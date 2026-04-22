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
	const [showConfirm, setShowConfirm] = useState(false)
	const [logoutError, setLogoutError] = useState('')
	const [isLoggingOut, setIsLoggingOut] = useState(false)

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

	const initial = useMemo(() => {
		return roleLabel.charAt(0).toUpperCase() || 'U'
	}, [roleLabel])

	const displayName = roleLabel

	const openLogoutConfirm = () => {
		setMenuOpen(false)
		setShowConfirm(true)
	}

	useEffect(() => {
		if (showConfirm) {
			setMenuOpen(false)
		}
	}, [showConfirm])

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
					<button type="button" className={styles.iconBtn} aria-label="Notifications">
						<BellIcon className={styles.topIcon} aria-hidden="true" />
					</button>

					<div className={styles.userMenuWrap}>
						<button
							type="button"
							className={styles.userMenuBtn}
							onClick={() => setMenuOpen((prev) => !prev)}
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
