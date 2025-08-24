"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

export default function JowTowTransition() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsVisible(true);
    }, 1500);

    return () => {
      clearTimeout(timeout);
    };
  }, []);
  return (
    <>
      <div
        onMouseOver={() => setIsVisible(false)}
        onMouseOut={() => setIsVisible(true)}
        className="hover:cursor-pointer flex"
      >
        <motion.div layout className="text-[var(--color-primary)]">
          j
        </motion.div>
        <motion.div layout className="text-[var(--color-primary)]">
          o
        </motion.div>
        {isVisible && (
          <>
            <AppearingLetter letter="h"></AppearingLetter>
            <AppearingLetter letter="n"></AppearingLetter>
            <AppearingLetter letter="&nbsp;"></AppearingLetter>
          </>
        )}
        <motion.div layout className="text-[var(--color-primary)]">
          w
        </motion.div>

        {isVisible && <AppearingLetter letter="&nbsp;"></AppearingLetter>}
        <motion.div layout className="text-[var(--color-primary)]">
          t
        </motion.div>
        <motion.div layout className="text-[var(--color-primary)]">
          o
        </motion.div>
        <motion.div layout className="text-[var(--color-primary)]">
          w
        </motion.div>

        {isVisible && (
          <>
            <AppearingLetter letter="n"></AppearingLetter>
            <AppearingLetter letter="s"></AppearingLetter>
            <AppearingLetter letter="e"></AppearingLetter>
            <AppearingLetter letter="n"></AppearingLetter>
            <AppearingLetter letter="d"></AppearingLetter>
          </>
        )}
      </div>
    </>
  );
}

function AppearingLetter({ letter }: { letter: string }) {
  return (
    <AnimatePresence>
      <motion.div
        layout
        exit={{ opacity: 0 }}
        initial={{ opacity: 0, rotate: 50, y: 20 }}
        animate={{ opacity: 0.8, rotate: 0, y: 0 }}
        transition={{ duration: 1 }}
      >
        {letter}
      </motion.div>
    </AnimatePresence>
  );
}
