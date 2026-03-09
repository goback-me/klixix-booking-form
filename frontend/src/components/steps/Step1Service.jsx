import { useState } from 'preact/hooks'
import ServiceCard from '../ServiceCard'

export default function Step1Service() {
  const [selectedServiceId, setSelectedServiceId] = useState(null)

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
    <div className="p-4 sm:p-6 md:p-8 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 break-words">Book your vehicle service</h2>
        <p className="text-gray-600 mb-6 md:mb-8 break-words">Choose the type of service you need</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 auto-rows-max">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  selected={selectedServiceId === service.id}
                  onSelect={() => setSelectedServiceId(service.id)}
                    containerHeight="h-45 md:h-45"
                />
              ))}        </div>     </div>
    </div>
  )
}
