import Link from 'next/link'
import styles from './login.module.css'

export default function LoginPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Login</h1>
      <p className={styles.lead}>Sign in to access the OneHOA dashboard.</p>

      <form className={styles.form}>
        <label className={styles.field}>
          Email
          <input type="email" name="email" className={styles.input} />
        </label>

        <label className={styles.field}>
          Password
          <input type="password" name="password" className={styles.input} />
        </label>

        <button type="submit" className={styles.button}>Sign in</button>
      </form>

      <nav className={styles.nav}>
        <Link href="/">Back to Landing</Link>
      </nav>
    </main>
  )
}

