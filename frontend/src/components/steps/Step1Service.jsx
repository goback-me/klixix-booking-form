import ServiceCard from '../ServiceCard'

export default function Step1Service({ bookingData, updateBookingData }) {

  const services = [
    {
      id:1,
      name: 'Vehicle repair',
      image: './vehicle-repair.webp',
    }
    ,{
      id:2,
      name: 'General service', 
      image: './general-service.webp',
    }
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
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 break-words">Book your vehicle service</h2>
        <p className="text-gray-600 mb-4 md:mb-5 break-words">Choose the type of service you need</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 auto-rows-max">
              {services.map((service, idx) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  selected={bookingData.service?.id === service.id}
                  onSelect={() => updateBookingData('service', service)}
                    containerHeight="aspect-[3/2] card-img-responsive"
                    index={idx}
                />
              ))}        </div>     </div>
    </div>
  )
}
