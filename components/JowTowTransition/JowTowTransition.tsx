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
        onClick={() => setIsVisible((x) => !x)}
        className="hover:cursor-pointer flex "
      >
        <motion.div layoutId={crypto.randomUUID()} className="">
          j
        </motion.div>
        <motion.div layoutId={crypto.randomUUID()} className="">
          o
        </motion.div>
        {isVisible && (
          <>
            <AppearingLetter letter="h"></AppearingLetter>
            <AppearingLetter letter="n"></AppearingLetter>
            <AppearingLetter letter="&nbsp;"></AppearingLetter>
          </>
        )}
        <motion.div layoutId={crypto.randomUUID()} className="">
          w
        </motion.div>

        {isVisible && <AppearingLetter letter="&nbsp;"></AppearingLetter>}
        <motion.div layoutId={crypto.randomUUID()} className="">
          t
        </motion.div>
        <motion.div layoutId={crypto.randomUUID()} className="">
          o
        </motion.div>
        <motion.div layoutId={crypto.randomUUID()} className="">
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
        layoutId={crypto.randomUUID()}
        exit={{ opacity: 0 }}
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          type: "spring",
          damping: 10,
          stiffness: 200,
        }}
      >
        {letter}
      </motion.div>
    </AnimatePresence>
  );
}
