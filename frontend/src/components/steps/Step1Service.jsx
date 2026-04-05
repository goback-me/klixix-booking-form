import { ArrowLeft } from 'lucide-react'
import ServiceCard from '../ServiceCard'

export default function Step1Service({ bookingData, updateBookingData, onAutoAdvance, onPrev }) {

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
    <div className="p-3 sm:p-4 md:p-5 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <div className="sm:hidden mb-2">
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="mb-3 inline-flex items-center gap-3 text-black"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-black bg-white">
                <ArrowLeft className="h-7 w-7" strokeWidth={2.1} aria-hidden="true" />
              </span>
              <span className="text-[2rem] leading-none font-light">Back</span>
            </button>
          )}
          <div className="min-w-0">
            <h2 className="text-[32px] leading-[1.08] tracking-[-0.015em] text-gray-900 mb-0.5 break-words">Select a service</h2>
            <p className="text-md text-gray-600 break-words pb-2">What can we help you with today?</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center justify-start gap-4 mb-3 w-full">
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[3px] border-black bg-white text-black"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2.1} aria-hidden="true" />
            </button>
          )}
          <div className="min-w-0 text-left">
            <h2 className="text-[32px] leading-[1.08] tracking-[-0.015em] text-gray-900 mb-0.5 break-words">Select a service</h2>
            <p className="text-md text-gray-600 break-words pb-2">What can we help you with today?</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 md:gap-3 auto-rows-max pb-6 sm:pb-8">
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
                    containerHeight="h-[5.25rem] sm:h-[7rem] md:h-[5.5rem] lg:h-[7rem]"
                    index={idx}
                />
              ))}
        </div>
      </div>
    </div>
  )
}
