"use client"
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { HiOutlineUsers, HiOutlineArrowRightOnRectangle, HiOutlineArrowLeftOnRectangle } from 'react-icons/hi2'
import { apiClient, ApiError } from '@/lib/apiClient'
import styles from './sidebar.module.css'

export default function Sidebar({ isCollapsed = false, links = [], user }) {
	const pathname = usePathname()
	const router = useRouter()

	const [showConfirm, setShowConfirm] = useState(false)
	const [logoutError, setLogoutError] = useState('')
	const [isLoggingOut, setIsLoggingOut] = useState(false)

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

	const roleLabel = formatRole(user?.role)
	const displayName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : roleLabel
	const initial = roleLabel.charAt(0).toUpperCase() || 'U'

	const handleConfirmLogout = async () => {
		setLogoutError('')
		setIsLoggingOut(true)
		try {
			await apiClient.post('/auth/logout')
			router.push('/login')
			router.refresh()
			setShowConfirm(false)
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
			<aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
				<div className={styles.profileCard}>
					<div className={styles.avatarCircle}>{initial}</div>
					{!isCollapsed && (
						<div className={styles.profileDetails}>
							<p className={styles.profileName} title={displayName}>{displayName}</p>
							<p className={styles.profileRole}>{roleLabel}</p>
						</div>
					)}
				</div>

				<nav className={styles.navigation}>
					<ul className={styles.navList}>
						{links.map(({ href, label, Icon = HiOutlineUsers }) => {
							const isActive = pathname === href

							return (
								<li key={href} className={styles.item}>
									<Link href={href} className={`${styles.link} ${isActive ? styles.active : ''}`}>
										<Icon className={styles.icon} aria-hidden="true" />
										<span className={styles.label}>{label}</span>
									</Link>
								</li>
							)
						})}
					</ul>
				</nav>

				<div className={styles.bottomSection}>
					{!isCollapsed && (
						<div className={styles.sidebarLegal}>
							<Link href="/terms-and-conditions" className={styles.legalLink}>
								Terms
							</Link>
							<span className={styles.legalSeparator}>•</span>
							<Link href="/privacy-policy" className={styles.legalLink}>
								Privacy
							</Link>
						</div>
					)}
					<button
						type="button"
						className={styles.logoutBtn}
						onClick={() => setShowConfirm(true)}
						title="Logout"
					>
						<HiOutlineArrowLeftOnRectangle className={styles.icon} aria-hidden="true" />
						{!isCollapsed && <span className={styles.label}>Logout</span>}
					</button>
				</div>
			</aside>

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
