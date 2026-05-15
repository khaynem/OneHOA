"use client"
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './sidebar.module.css'

export default function Sidebar({ isCollapsed = false, links = DEFAULT_LINKS }) {
	const pathname = usePathname()

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
		</aside>
	)
}
