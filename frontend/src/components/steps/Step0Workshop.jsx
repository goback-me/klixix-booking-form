import ServiceCard from '../ServiceCard'

/**
 * @param {{ bookingData: any, updateBookingData: (key: string, value: any) => void, onAutoAdvance?: (key: string, value: any) => void }} props
 */
export default function Step0Workshop({ bookingData, updateBookingData, onAutoAdvance }) {

  const services = [
    {
      id: 1,
      workshopId: 'hendra',
      name: 'Hendra workshop',
      address: '238 Nudgee Rd, Hendra QLD 4011, Australia',
      time: 'Open today until 5:00pm',
      phone:'0736070215',
      image: "./hendra-workshop.webp",
    },
    {
      id: 2,
      workshopId: 'woolloongabba',
      name: 'Woolloongabba workshop',
      address: '187 Logan Rd, Woolloongabba QLD 4102, Australia',
      time: 'Open today until 5:00pm',
      phone:'0736070215',
      image: "./woolloongabba-workshop.webp",
    },
  ]

  return (
    <div className="p-3 sm:p-5 md:p-6 pb-3 sm:pb-8 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <h2 className="text-[1.85rem] sm:text-2xl md:text-3xl leading-[1.1] mb-1 sm:mb-2 text-primary-dark break-words">Choose your workshop</h2>
        <p className="text-sm text-gray-600 mb-2 sm:mb-3 md:mb-5 break-words">Experience premium automotive care with our expert technicians</p>
        <div className="mb-2 sm:mb-3 md:mb-5 border-t-1 border-gray-300"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4 auto-rows-max">
        {services.map((service, idx) => (
          <ServiceCard
            key={service.id}
            service={service}
            selected={bookingData.workshop?.id === service.id}
            variant="workshop"
            // Responsive, larger image area, aspect ratio 16:5 for banner look
            containerHeight="aspect-[16/5] min-h-[120px] sm:min-h-[140px] md:min-h-[180px] lg:min-h-[210px] xl:min-h-[240px]"
            imageHeight={320}
            imageWidth={960}
            index={idx}
            onSelect={() => {
              if (onAutoAdvance) {
                onAutoAdvance('workshop', service)
              } else {
                updateBookingData('workshop', service)
              }
              if (typeof window !== 'undefined') {
                window.localStorage.setItem('selectedWorkshop', service.workshopId)
              }
            }}
          />
        ))}        </div>      </div>
    </div>
  )
}
