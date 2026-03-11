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
        <h2 className="text-2xl sm:text-3xl md:text-4xl mb-2 text-primary-dark break-words">Book your vehicle service</h2>
        <p className="text-gray-600 mb-4 md:mb-5 break-words">Experience premium automotive care with our expert technicians</p>
        <div className="mb-3 md:mb-5 border-t-1 border-gray-300"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 auto-rows-max">
        {services.map((service, idx) => (
          <ServiceCard
            key={service.id}
            service={service}
            selected={bookingData.workshop?.id === service.id}
            containerHeight="aspect-[4/3] card-img-responsive"
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
