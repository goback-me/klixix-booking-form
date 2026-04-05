import ServiceCard from '../ServiceCard'

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
    <div className="p-4 sm:p-5 md:p-6 pb-6 sm:pb-8 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <h2 className="text-3xl sm:text-2xl md:text-3xl mb-1 sm:mb-2 text-primary-dark break-words">Choose your workshop</h2>
        <p className="text-sm sm:text-sm text-gray-600 mb-3 md:mb-5 break-words">Experience premium automotive care with our expert technicians</p>
        <div className="mb-2 md:mb-5 border-t-1 border-gray-300"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3 md:gap-4 auto-rows-max">
        {services.map((service, idx) => (
          <ServiceCard
            key={service.id}
            service={service}
            selected={bookingData.workshop?.id === service.id}
            variant="workshop"
            containerHeight="aspect-[16/6]"
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
