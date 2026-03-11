import { Check, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

export default function Sidebar({ steps, currentStep, allCompleted = false }) {
  return (
    <>
      {/* ── Mobile & Tablet horizontal stepper ── */}
      <div className="flex lg:hidden items-center px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        {steps.map((step, index) => {
          const isCompleted = allCompleted || index < currentStep
          const isCurrent = !allCompleted && index === currentStep
          const isLast = index === steps.length - 1
          const showActiveConnector = allCompleted || index < currentStep || index === currentStep

          return (
            <div key={index} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border transition ${
                    isCurrent ? 'stepper-active' : ''
                  } ${
                    isCompleted
                      ? 'bg-green-100 border-green-500 text-green-600'
                      : isCurrent
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {isCompleted ? (
                      <motion.span key="check" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                        <Check size={14} strokeWidth={2.2} />
                      </motion.span>
                    ) : isCurrent ? (
                      <motion.span key="plus" initial={{ scale: 0, rotate: 90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                        <Plus size={14} strokeWidth={2.2} />
                      </motion.span>
                    ) : (
                      <motion.span key="num" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-xs font-medium">
                        {index + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <span
                  className={`text-[10px] mt-1 whitespace-nowrap ${
                    isCompleted
                      ? 'text-green-600 font-medium'
                      : isCurrent
                        ? 'text-orange-500 font-medium'
                        : 'text-gray-400'
                  }`}
                >
                  {step}
                </span>
              </div>

              {!isLast && (
                <div className="flex-1 flex items-center justify-between mx-2 mt-[-12px] gap-[3px]">
                  {Array.from({ length: 4 }).map((_, dotIndex) => (
                    <span
                      key={`m-${index}-${dotIndex}`}
                      className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${showActiveConnector ? 'bg-green-500 dot-active' : 'bg-gray-300 opacity-35'}`}
                      style={showActiveConnector ? { animationDelay: `${dotIndex * 0.08}s` } : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Desktop vertical sidebar ── */}
      <div className="hidden lg:flex lg:w-64 bg-white p-4 lg:p-5 flex-col flex-shrink-0 min-h-0">
        <div className="sidebar-styling p-4 flex flex-col h-full min-h-0">
          <nav className="flex-1 overflow-y-auto pr-1">
            {steps.map((step, index) => {
              const isCompleted = allCompleted || index < currentStep
              const isCurrent = !allCompleted && index === currentStep
              const isLast = index === steps.length - 1
              const showActiveConnector = allCompleted || index < currentStep || index === currentStep

              return (
                <div key={index} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border transition ${
                        isCurrent ? 'stepper-active-lg' : ''
                      } ${
                        isCompleted
                          ? 'bg-green-100 border-green-500 text-green-600'
                          : isCurrent
                            ? 'bg-orange-500 border-orange-500 text-white'
                            : 'bg-white border-gray-300 text-gray-400'
                      }`}
                    >
                      {isCompleted ? <Check size={16} strokeWidth={2.2} /> : isCurrent ? <Plus size={16} strokeWidth={2.2} /> : <span className="text-xs font-medium">{index + 1}</span>}
                    </div>

                    {!isLast && (
                      <div className="py-1.5 h-14 flex flex-col justify-between">
                        {Array.from({ length: 6 }).map((_, dotIndex) => (
                          <span
                            key={`${index}-${dotIndex}`}
                            className={`h-1.5 w-1.5 rounded-full ${showActiveConnector ? 'bg-green-500 dot-active' : 'bg-gray-300 opacity-35'}`}
                            style={showActiveConnector ? { animationDelay: `${dotIndex * 0.06}s` } : undefined}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-1">
                    <p className="text-xs text-gray-400 mb-0.5">{`Step ${index + 1}/${steps.length}`}</p>
                    <p
                      className={`text-lg leading-tight ${
                        isCompleted
                          ? 'text-green-600 font-semibold'
                          : isCurrent
                            ? 'text-orange-500 font-semibold'
                            : 'text-gray-500'
                      }`}
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {step}
                    </p>
                  </div>
                </div>
              )
            })}
          </nav>
        </div>
      </div>
    </>
  )
}
