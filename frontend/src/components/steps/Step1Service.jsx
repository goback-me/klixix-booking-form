import ServiceCard from '../ServiceCard'
import StepHeader from '../StepHeader'

/**
 * @param {{ bookingData: any, updateBookingData: (key: string, value: any) => void, onAutoAdvance?: (key: string, value: any) => void, onPrev?: () => void, onGoToStep?: (step: number) => void }} props
 */
export default function Step1Service({ bookingData, updateBookingData, onAutoAdvance, onPrev, onGoToStep }) {

  const services = [
    {
      id: 1,
      name: 'General service',
      badge: 'Most booked',
      image: './svc-general.png',
    },
    {
      id: 2,
      name: 'Vehicle repair',
      image: './svc-vehicle-repair.png',
    },
    {
      id: 3,
      name: 'Roadworthy certificate',
      image: './svc-roadworthy.png',
    },
    {
      id: 4,
      name: 'Pre purchase inspection',
      image: './svc-prepurchase.png',
    },
    {
      id: 5,
      name: 'Other enquiry',
      image: './svc-other.png',
    },
  ]

  return (
    <div className="p-2.5 sm:p-4 md:p-5 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <StepHeader
          title="What type of service do you need?"
          subtitle="Select one, you can add extras in step 5"
          onBack={onPrev}
          bookingData={bookingData}
          onGoToStep={onGoToStep}
        />
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
