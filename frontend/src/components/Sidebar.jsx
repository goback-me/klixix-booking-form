import { Check, Plus, Building2, Wrench, CalendarDays, Car, Package } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

// Step-specific icons for each step
const stepIcons = [
  { icon: Building2, label: 'Workshop' },
  { icon: Wrench, label: 'Service' },
  { icon: CalendarDays, label: 'Date & time' },
  { icon: Car, label: 'Car details' },
  { icon: Package, label: 'Add-ons' },
]

// Desktop: small→big→small dot sizes for vertical connector
const desktopDotSizes = [
  'h-1 w-1',
  'h-1.5 w-1.5',
  'h-2 w-2',
  'h-2.5 w-2.5',
  'h-2 w-2',
  'h-1.5 w-1.5',
  'h-1 w-1',
]

// Mobile: fewer dots to prevent clipping
const mobileDotSizes = [
  'h-1 w-1',
  'h-1.5 w-1.5',
  'h-1 w-1',
]

function dotColor(isCompleted, isCurrent) {
  if (isCompleted) return 'bg-green-500'
  if (isCurrent) return 'bg-[rgba(255,77,36,1)]'
  return 'bg-gray-300'
}

export default function Sidebar({ steps, currentStep, allCompleted = false }) {
  return (
    <>
      {/* ── Mobile & Tablet horizontal stepper ── */}
      <div className="flex lg:hidden items-center px-1.5 sm:px-4 py-2 sm:py-3 bg-white border-b border-gray-200 flex-shrink-0">
        {steps.map((step, index) => {
          const isCompleted = allCompleted || index < currentStep
          const isCurrent = !allCompleted && index === currentStep
          const isLast = index === steps.length - 1
          const connectorCompleted = allCompleted || index < currentStep
          const connectorCurrent = !allCompleted && index === currentStep

          return (
            <div key={index} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-5 h-5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border transition ${
                    isCurrent ? 'stepper-active' : ''
                  } ${
                    isCompleted
                      ? 'bg-green-100 border-green-500 text-green-600'
                      : isCurrent
                        ? 'bg-[rgba(255,77,36,1)] border-[rgba(255,77,36,1)] text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {isCompleted ? (
                      <motion.span key="check" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                        <Check size={12} className="sm:hidden" strokeWidth={2.2} />
                        <Check size={14} className="hidden sm:block" strokeWidth={2.2} />
                      </motion.span>
                    ) : (() => {
                      const StepIcon = stepIcons[index]?.icon
                      return StepIcon ? (
                        <motion.span key="icon" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                          <StepIcon size={12} className="sm:hidden" strokeWidth={1.8} />
                          <StepIcon size={14} className="hidden sm:block" strokeWidth={1.8} />
                        </motion.span>
                      ) : (
                        <motion.span key="num" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-[10px] sm:text-xs font-medium">
                          {index + 1}
                        </motion.span>
                      )
                    })()}
                  </AnimatePresence>
                </div>
                <span
                  className={`text-[7px] sm:text-[10px] mt-0.5 sm:mt-1 whitespace-nowrap ${
                    isCompleted
                      ? 'text-green-600 font-medium'
                      : isCurrent
                        ? 'text-[rgba(255,77,36,1)] font-medium'
                        : 'text-gray-400'
                  }`}
                >
                  {step}
                </span>
              </div>

              {!isLast && (
                <div className="flex-1 flex items-center justify-center mx-1 mt-[-10px] gap-[2px]">
                  {mobileDotSizes.map((size, dotIndex) => (
                    <span
                      key={`m-${index}-${dotIndex}`}
                      className={`${size} rounded-full flex-shrink-0 ${
                        connectorCompleted
                          ? 'bg-green-500 dot-active'
                          : connectorCurrent
                                  ? 'bg-[rgba(255,77,36,1)] dot-active'
                            : 'bg-gray-300 opacity-40'
                      }`}
                      style={(connectorCompleted || connectorCurrent) ? { animationDelay: `${dotIndex * 0.08}s` } : undefined}
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
              const connectorCompleted = allCompleted || index < currentStep
              const connectorCurrent = !allCompleted && index === currentStep

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
                            ? 'bg-[rgba(255,77,36,1)] border-[rgba(255,77,36,1)] text-white'
                            : 'bg-white border-gray-300 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Check size={16} strokeWidth={2.2} />
                      ) : (() => {
                        const StepIcon = stepIcons[index]?.icon
                        return StepIcon ? <StepIcon size={18} strokeWidth={1.8} /> : <span className="text-xs font-medium">{index + 1}</span>
                      })()}
                    </div>

                    {!isLast && (
                      <div className="py-2 h-20 flex flex-col items-center justify-between">
                        {desktopDotSizes.map((size, dotIndex) => (
                          <span
                            key={`${index}-${dotIndex}`}
                            className={`${size} rounded-full ${
                              connectorCompleted
                                ? 'bg-green-500 dot-active'
                                : connectorCurrent
                                  ? 'bg-[rgba(255,77,36,1)] dot-active'
                                  : 'bg-gray-300 opacity-40'
                            }`}
                            style={(connectorCompleted || connectorCurrent) ? { animationDelay: `${dotIndex * 0.06}s` } : undefined}
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
                            ? 'text-[rgba(255,77,36,1)] font-semibold'
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
