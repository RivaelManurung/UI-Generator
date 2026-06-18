import type { Variants } from "framer-motion";

const easeOut = [0.16, 1, 0.3, 1] as const;
const easeInOut = [0.65, 0, 0.35, 1] as const;

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35, ease: easeOut } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: easeOut } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -18 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: easeOut } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 18 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: easeOut } },
};

export const softFloat = {
  animate: {
    y: [0, -8, 0],
    transition: { duration: 5, repeat: Infinity, ease: easeInOut },
  },
};

export const cardHover = {
  whileHover: { y: -4, transition: { duration: 0.2, ease: "easeOut" } },
};
