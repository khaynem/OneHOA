"use client";

import {
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
} from "react-icons/fi";
import styles from "./toast-message.module.css";

const variantConfig = {
  success: {
    title: "Success",
    Icon: FiCheckCircle,
  },
  info: {
    title: "Info",
    Icon: FiInfo,
  },
  error: {
    title: "Error",
    Icon: FiAlertCircle,
  },
};

export default function ToastMessage({
  variant = "info",
  title,
  description,
  visible = true,
}) {
  const config = variantConfig[variant] || variantConfig.info;
  const Icon = config.Icon;

  return (
    <article
      className={`${styles.toastCard} ${styles[variant] || styles.info} ${
        visible ? styles.visible : styles.hidden
      }`}
    >
      <span className={styles.iconWrap} aria-hidden="true">
        <Icon className={styles.icon} />
      </span>

      <div className={styles.content}>
        <p className={styles.title}>{title || config.title}</p>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
    </article>
  );
}
