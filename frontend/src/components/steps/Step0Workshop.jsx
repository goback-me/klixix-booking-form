import ServiceCard from '../ServiceCard'

export default function Step0Workshop({ bookingData, updateBookingData }) {

  const services = [
    {
      id: 1,
      workshopId: 'hendra',
      name: 'Hendra workshop',
      address: '238 Nudgee Rd, Hendra QLD 4011',
      time: 'Open today until 5:00pm',
      phone:'+1 (07) 3607 0215',
      image: "./hendra-workshop.webp",
      rating: 4.8,
    },
    {
      id: 2,
      workshopId: 'woolloongabba',
      name: 'Woolloongabba workshop',
      address: '456 Main St, Woolloongabba QLD 4102',
      time: 'Open today until 5:00pm',
      phone:'+1 (07) 3607 0215',
      image: "./woolloongabba-workshop.webp",
      rating: 4.8,
    },
  ]

  return (
    <div className="p-4 sm:p-5 md:p-6 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <h2 className="text-lg sm:text-2xl md:text-3xl mb-1 sm:mb-2 text-primary-dark break-words">Book your vehicle service</h2>
        <p className="text-xs sm:text-sm text-gray-600 mb-3 md:mb-5 break-words">Experience premium automotive care with our expert technicians</p>
        <div className="mb-2 md:mb-5 border-t-1 border-gray-300"></div>
        <div className="grid sm:grid-cols-2 grid-cols-1 gap-3 md:gap-4 auto-rows-max">
        {services.map((service, idx) => (
          <ServiceCard
            key={service.id}
            service={service}
            selected={bookingData.workshop?.id === service.id}
            containerHeight="h-28 sm:h-36 md:h-44 lg:h-62"
            index={idx}
            onSelect={() => {
              updateBookingData('workshop', service)
              if (typeof window !== 'undefined') {
                window.localStorage.setItem('selectedWorkshop', service.workshopId)
              }
            }}
          />
        ))}        </div>      </div>
    </div>
  )
}
