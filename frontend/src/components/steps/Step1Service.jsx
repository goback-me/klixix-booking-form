import ServiceCard from '../ServiceCard'

export default function Step1Service({ bookingData, updateBookingData, onAutoAdvance }) {

  const services = [
    {
      id:1,
      name: 'General service', 
      image: './general-service.webp',
    }
    ,
    {
      id:2,
      name: 'Vehicle repair',
      image: './vehicle-repair.webp',
    }
    ,
    ,{
      id:3,
      name: 'Roadworthy certificate',
      image: './roadworthy-certificate.webp',
    }
    ,{
      id:4,
      name: 'Pre purchase inspection',
      image: './pre-purchase-inspection.webp',
    }
    ,{
      id:5,
      name: 'Other enquiry',
      image: './other-enquiry.webp',
    }
  ]

  return (
    <div className="p-4 sm:p-5 md:p-6 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <h2 className="text-2xl md:text-3xl text-gray-900 mb-1 break-words">Select a service</h2>
        <p className="text-gray-600 mb-4 md:mb-5 break-words">What can we help you with today?</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 auto-rows-max">
              {services.map((service, idx) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  selected={bookingData.service?.id === service.id}
                  onSelect={() => {
                    if (onAutoAdvance) {
                      onAutoAdvance('service', service)
                    } else {
                      updateBookingData('service', service)
                    }
                  }}
                    containerHeight="h-16 sm:h-20 md:h-24 lg:h-28"
                    index={idx}
                />
              ))}        </div>     </div>
    </div>
  )
}
