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
	const [menuOpen, setMenuOpen] = useState(false)
	const [showConfirm, setShowConfirm] = useState(false)
	const [logoutError, setLogoutError] = useState('')
	const [isLoggingOut, setIsLoggingOut] = useState(false)

	const initial = useMemo(() => {
		if (!user?.name) return 'A'
		return user.name.charAt(0).toUpperCase()
	}, [user])

	const displayName = user?.name || 'Admin'

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
