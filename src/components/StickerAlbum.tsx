import React from 'react';
import { Sticker, STICKERS } from '../types';
import { motion } from 'motion/react';

interface StickerAlbumProps {
  earnedStickerIds: string[];
}

export const StickerAlbum: React.FC<StickerAlbumProps> = ({ earnedStickerIds }) => {
  return (
    <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
      <h3 className="text-lg font-semibold text-slate-800 mb-6">My Sticker Album</h3>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
        {STICKERS.map((sticker) => {
          const isEarned = earnedStickerIds.includes(sticker.id);
          return (
            <motion.div
              key={sticker.id}
              whileHover={isEarned ? { scale: 1.1, rotate: 5 } : {}}
              className={`relative aspect-square flex items-center justify-center rounded-2xl border-2 transition-all ${
                isEarned 
                  ? 'bg-amber-50 border-amber-200 shadow-sm' 
                  : 'bg-slate-50 border-slate-100 grayscale opacity-40'
              }`}
            >
              <span className="text-4xl">{sticker.imageUrl}</span>
              {!isEarned && (
                <div className="absolute -bottom-2 px-2 py-0.5 bg-slate-200 rounded-full text-[10px] font-bold text-slate-500">
                  {sticker.unlockPoints} pts
                </div>
              )}
              {isEarned && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm"
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
