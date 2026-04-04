import ServiceCard from '../ServiceCard'

export default function Step4AddExtra({ bookingData, updateBookingData }) {
  const isWoolloongabba = bookingData?.workshop?.workshopId === 'woolloongabba'

  const services = [
    { id: 1, name: 'Tyre rotation & balancing', price: '$77.50', image: '/tyre-rotation.svg' },
    { id: 2, name: 'Engine flush plus', price: '$39.50', image: '/Engine flush plus.svg' },
    { id: 3, name: 'A/C clean & deodoriser', price: '$38.25', image: '/AC clean & deodoriser.svg' },
    { id: 4, name: 'Wiper blade replacement', price: '$27.00 each', image: '/Wiper blade replacement.svg' },
    { id: 5, name: 'A/C re-gas & full service', price: '$250.00', image: '/AC re-gas & full service.svg' },
    { id: 6, name: 'Tyre puncture repair', price: '$46.50', image: '/Tyre puncture repair.svg' },
  ]

  const selectedExtras = bookingData.extras || []

  const toggleService = (id) => {
    if (selectedExtras.includes(id)) {
      updateBookingData('extras', selectedExtras.filter((itemId) => itemId !== id))
    } else {
      updateBookingData('extras', [...selectedExtras, id])
    }
  }

  return (
    <div className="p-4 sm:p-5 md:p-6 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <h2 className="text-2xl md:text-3xl text-gray-900 mb-1 break-words">Book your vehicle service</h2>
        <p className="text-gray-600 mb-4 break-words">Experience premium automotive care with our expert technicians</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-3 gap-3 md:gap-4">
          {services.map((service, idx) => (
            <ServiceCard
              key={service.id}
              service={{ ...service, price: isWoolloongabba ? null : service.price }}
              selected={selectedExtras.includes(service.id)}
              onSelect={() => toggleService(service.id)}
              variant="compact"
              containerHeight="h-20 card-img-compact"
              imageWidth={90}
              imageHeight={60}
              index={idx}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
