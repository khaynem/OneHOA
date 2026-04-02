"use client"
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
	HiOutlineCalendarDays,
	HiOutlineCreditCard,
	HiOutlineHome,
	HiOutlineUsers,
} from 'react-icons/hi2'
import styles from './sidebar.module.css'

export default function Sidebar({ isCollapsed = false }) {
	const pathname = usePathname()
	const links = [
		{ href: '/dashboard', label: 'Dashboard', Icon: HiOutlineHome },
		{ href: '/homeowner-management', label: 'Homeowner Management', Icon: HiOutlineUsers },
		{ href: '/payment-monitoring', label: 'Payment Monitoring', Icon: HiOutlineCreditCard },
		{ href: '/hoa-activities', label: 'HOA Activities', Icon: HiOutlineCalendarDays },
	]

	return (
		<aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
			<div className={styles.brandWrap}>
				<Image
					src="/images/HOA Logo.png"
					alt="HOA Logo"
					width={36}
					height={36}
					className={styles.logo}
					priority
				/>
				<span className={styles.brand}>OneHOA</span>
			</div>

			<nav>
				<ul className={styles.navList}>
					{links.map(({ href, label, Icon }) => {
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
		</aside>
	)
}
