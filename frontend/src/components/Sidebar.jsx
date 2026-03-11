import { Check, Plus } from 'lucide-react'
import { motion } from 'motion/react'

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
                <motion.div
                  initial={{ scale: 0.92, opacity: 0.9 }}
                  animate={isCurrent
                    ? { scale: [1, 1.06, 1], opacity: 1 }
                    : { scale: 1, opacity: 1 }}
                  transition={isCurrent
                    ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.2 }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center border transition ${
                    isCompleted
                      ? 'bg-green-100 border-green-500 text-green-600'
                      : isCurrent
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {isCompleted
                    ? <Check size={14} strokeWidth={2.2} />
                    : isCurrent
                      ? <Plus size={14} strokeWidth={2.2} />
                      : <span className="text-xs font-medium">{index + 1}</span>}
                </motion.div>
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
                <div className="flex-1 flex items-center mx-2 mt-[-12px]">
                  <motion.div
                    className={`h-0.5 w-full rounded-full ${showActiveConnector ? 'bg-green-500' : 'bg-gray-300'}`}
                    initial={{ opacity: 0.35 }}
                    animate={showActiveConnector
                      ? { opacity: [0.5, 1, 0.5] }
                      : { opacity: 0.35 }}
                    transition={showActiveConnector
                      ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                      : { duration: 0.2 }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Desktop vertical sidebar ── */}
      <div className="hidden lg:flex lg:w-84 bg-white p-6 lg:p-8 flex-col flex-shrink-0 min-h-0">
        <div className="sidebar-styling p-6 flex flex-col h-full min-h-0">
          <nav className="flex-1 overflow-y-auto pr-1">
            {steps.map((step, index) => {
              const isCompleted = allCompleted || index < currentStep
              const isCurrent = !allCompleted && index === currentStep
              const isLast = index === steps.length - 1
              const showActiveConnector = allCompleted || index < currentStep || index === currentStep

              return (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <motion.div
                      initial={{ scale: 0.92, opacity: 0.9 }}
                      animate={isCurrent
                        ? { scale: [1, 1.04, 1], opacity: 1 }
                        : { scale: 1, opacity: 1 }}
                      transition={isCurrent
                        ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                        : { duration: 0.2 }}
                      className={`w-12 h-12 rounded-full flex items-center justify-center border transition ${
                        isCompleted
                          ? 'bg-green-100 border-green-500 text-green-600'
                          : isCurrent
                            ? 'bg-orange-500 border-orange-500 text-white'
                            : 'bg-white border-gray-300 text-gray-400'
                      }`}
                    >
                      {isCompleted ? <Check size={20} strokeWidth={2.2} /> : isCurrent ? <Plus size={20} strokeWidth={2.2} /> : <span className="text-sm font-medium">{index + 1}</span>}
                    </motion.div>

                    {!isLast && (
                      <div className="py-1.5 h-14 flex flex-col justify-between">
                        {Array.from({ length: 6 }).map((_, dotIndex) => (
                          <motion.span
                            key={`${index}-${dotIndex}`}
                            className={`h-1.5 w-1.5 rounded-full ${showActiveConnector ? 'bg-green-500' : 'bg-gray-300'}`}
                            initial={{ opacity: 0.35, scale: 0.85 }}
                            animate={showActiveConnector
                              ? { opacity: [0.45, 1, 0.45], scale: [0.85, 1, 0.85] }
                              : { opacity: 0.35, scale: 0.85 }}
                            transition={showActiveConnector
                              ? { duration: 1.2, repeat: Infinity, delay: dotIndex * 0.06, ease: 'easeInOut' }
                              : { duration: 0.2 }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-1.5">
                    <p className="text-sm text-gray-400 mb-1">{`Step ${index + 1}/${steps.length}`}</p>
                    <p
                      className={`text-2xl leading-tight ${
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
