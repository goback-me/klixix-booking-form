import { ArrowLeft } from 'lucide-react'
import ServiceCard from '../ServiceCard'
import BreadcrumbBar from '../BreadcrumbBar'

/**
 * @param {{ bookingData: any, updateBookingData: (key: string, value: any) => void, onAutoAdvance?: (key: string, value: any) => void, onPrev?: () => void, onGoToStep?: (step: number) => void }} props
 */
export default function Step1Service({ bookingData, updateBookingData, onAutoAdvance, onPrev, onGoToStep }) {

  const services = [
    {
      id: 1,
      name: 'General service',
      image: './general-service.webp',
    },
    {
      id: 2,
      name: 'Vehicle repair',
      image: './vehicle-repair.webp',
    },
    {
      id: 3,
      name: 'Roadworthy certificate',
      image: './roadworthy-certificate.webp',
    },
    {
      id: 4,
      name: 'Pre purchase inspection',
      image: './pre-purchase-inspection.webp',
    },
    {
      id: 5,
      name: 'Other enquiry',
      image: './other-enquiry.webp',
    },
  ]

  return (
    <div className="p-2.5 sm:p-4 md:p-5 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <div className="sm:hidden mb-2">
          <div className="min-w-0">
            <h2 className="text-[26px] leading-[1.08] tracking-[-0.015em] text-gray-900 mb-0.5 break-words">Select a service</h2>
            <p className="text-[15px] text-gray-600 break-words mb-0">What can we help you with today?</p>
            {onGoToStep && <BreadcrumbBar bookingData={bookingData} onGoToStep={onGoToStep} />}
          </div>
        </div>
        <div className="hidden sm:flex items-center justify-start gap-4 mb-2 w-full">
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[3px] border-black bg-white text-black"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2.1} aria-hidden="true" />
            </button>
          )}
          <div className="min-w-0 text-left w-full">
            <h2 className="text-[32px] leading-[1.08] tracking-[-0.015em] text-gray-900 mb-0.5 break-words">Select a service</h2>
            <p className="text-md text-gray-600 break-words mb-0">What can we help you with today?</p>
            {onGoToStep && <BreadcrumbBar bookingData={bookingData} onGoToStep={onGoToStep} />}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2.5 md:gap-3 auto-rows-max pb-2 sm:pb-8">
              {services.map((service, idx) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  variant="service"
                  selected={bookingData.service?.id === service.id}
                  onSelect={() => {
                    if (onAutoAdvance) {
                      onAutoAdvance('service', service)
                    } else {
                      updateBookingData('service', service)
                    }
                  }}
                    containerHeight="aspect-[16/5] min-h-[110px] sm:min-h-[130px] md:min-h-[150px] lg:min-h-[160px]"
                    index={idx}
                />
              ))}
        </div>
      </div>
    </div>
  )
}
