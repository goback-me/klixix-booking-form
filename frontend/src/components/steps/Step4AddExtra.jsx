import { useEffect } from 'preact/hooks'
import ServiceCard from '../ServiceCard'
import { getAddonsByWorkshopId } from '../../constants/addons'
import BreadcrumbBar from '../BreadcrumbBar'

/**
 * @param {{ bookingData: any, updateBookingData: (key: string, value: any) => void, onGoToStep?: (step: number) => void }} props
 */
export default function Step4AddExtra({ bookingData, updateBookingData, onGoToStep }) {
  const services = getAddonsByWorkshopId(bookingData?.workshop?.workshopId)

  /** @type {number[]} */
  const selectedExtras = bookingData.extras || []

  useEffect(() => {
    const serviceIds = new Set(services.map((service) => service.id))
    const filteredExtras = selectedExtras.filter((/** @type {number} */ id) => serviceIds.has(id))
    if (filteredExtras.length !== selectedExtras.length) {
      updateBookingData('extras', filteredExtras)
    }
  }, [selectedExtras, services, updateBookingData])

  /** @param {number} id */
  const toggleService = (id) => {
    if (selectedExtras.includes(id)) {
      updateBookingData('extras', selectedExtras.filter((/** @type {number} */ itemId) => itemId !== id))
    } else {
      updateBookingData('extras', [...selectedExtras, id])
    }
  }

  return (
    <div className="p-2.5 sm:p-5 md:p-6 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <h2 className="text-[2rem] sm:text-2xl md:text-3xl leading-[1.08] text-gray-900 mb-1 break-words">Do you need anything else?</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-0 break-words">All prices are Exclusive of GST.</p>
        {onGoToStep && <BreadcrumbBar bookingData={bookingData} onGoToStep={onGoToStep} />}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mt-2">
          {services.map((service, idx) => (
            <ServiceCard
              key={service.id}
              service={{ ...service, price: service.priceLabel }}
              selected={selectedExtras.includes(service.id)}
              onSelect={() => toggleService(service.id)}
              variant="compact"
              containerHeight="h-16 sm:h-28 card-img-compact"
              imageWidth={140}
              imageHeight={84}
              index={idx}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
