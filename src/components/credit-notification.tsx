'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Zap, X } from 'lucide-react';

interface CreditNotificationProps {
  show: boolean;
  onClose: () => void;
}

export default function CreditNotification({ show, onClose }: CreditNotificationProps) {
  useEffect(() => {
    if (show) {
      // Auto close after 8 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 8000);
      
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: 400, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 400, scale: 0.9 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-4 right-4 z-50 max-w-sm"
        >
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-lg shadow-xl border border-amber-400">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-amber-100" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white mb-1">
                  🔋 Low Credit Balance
                </h4>
                <p className="text-sm text-amber-50 leading-relaxed">
                  <strong>No engagements will happen</strong> unless you engage with others first. 
                  <br />
                  <span className="inline-flex items-center gap-1 mt-1">
                    <Zap className="w-3 h-3" />
                    Like/RT/Follow others = Earn credits = Get engagements!
                  </span>
                </p>
              </div>
              
              <button
                onClick={onClose}
                className="flex-shrink-0 text-amber-200 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mt-3 pt-3 border-t border-amber-400/30">
              <div className="text-xs text-amber-100 font-medium">
                💡 The System: 1 Credit to Post → Others Engage → You Earn Credits
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}