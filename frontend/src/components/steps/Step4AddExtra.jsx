import { useEffect } from 'preact/hooks'
import ServiceCard from '../ServiceCard'
import { getAddonsByWorkshopId } from '../../constants/addons'

/**
 * @param {{ bookingData: any, updateBookingData: (key: string, value: any) => void }} props
 */
export default function Step4AddExtra({ bookingData, updateBookingData }) {
  const workshopId = bookingData?.workshop?.workshopId
  const isWoolloongabba = workshopId === 'woolloongabba'
  const services = getAddonsByWorkshopId(workshopId)

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

  /** @param {any} service */
  const renderGabbaPrice = (service) => {
    if (service.splitPrice) {
      return (
        <p className="text-[18px] sm:text-[18px] leading-none font-semibold text-[rgba(255,77,36,1)]" style={{ fontFamily: 'var(--font-display)' }}>
          {service.splitPrice.map((/** @type {{ value: string, suffix: string }} */ part, /** @type {number} */ idx) => (
            <span key={part.suffix} className="inline-flex items-baseline mr-2 last:mr-0">
              <span className="text-[18px] sm:text-[18px]">{part.value}</span>
              <span className="text-[18px] sm:text-[18px] ml-1">{part.suffix}</span>
              {idx < service.splitPrice.length - 1 ? <span className="mx-2"> </span> : null}
            </span>
          ))}
        </p>
      )
    }

    return (
      <p className="text-[18px] sm:text-[18px] leading-none font-semibold text-[rgba(255,77,36,1)]" style={{ fontFamily: 'var(--font-display)' }}>
        {service.priceLabel}
        {service.priceSuffix ? <span className="text-[18px] sm:text-[18px] ml-1">{service.priceSuffix}</span> : null}
      </p>
    )
  }

  const gabbaFeatured = services.find((service) => service.featured)
  const gabbaGridServices = services.filter((service) => !service.featured)

  return (
    <div className="p-2.5 sm:p-5 md:p-6 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <h2 className="text-[2rem] sm:text-2xl md:text-3xl leading-[1.08] text-gray-900 mb-1 break-words">Do you need anything else?</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-2 sm:mb-4 break-words">
          {isWoolloongabba ? 'Experience premium automotive care with our expert technicians' : 'All prices are Exclusive of GST.'}
        </p>

        {isWoolloongabba ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {gabbaGridServices.map((service) => {
                const isSelected = selectedExtras.includes(service.id)
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`rounded-2xl border p-2.5 sm:p-3 text-center transition-all duration-200 ${
                      isSelected
                        ? 'border-[rgba(255,77,36,1)] ring-2 ring-[rgba(255,77,36,1)] bg-white'
                        : 'border-gray-200 bg-gray-50 hover:border-[rgba(255,77,36,1)]'
                    }`}
                  >
                    <div className="h-16 sm:h-24 flex items-center justify-center mb-2 sm:mb-3">
                      <img
                        src={service.image}
                        alt={service.name}
                        className="max-h-full max-w-[80%] object-contain"
                        width={150}
                        height={84}
                      />
                    </div>
                    <div className="leading-tight mb-1">{renderGabbaPrice(service)}</div>
                    <h3 className="text-[18px] sm:text-[18px] leading-tight text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
                      {service.name}
                    </h3>
                  </button>
                )
              })}
            </div>

            {gabbaFeatured && (
              <button
                type="button"
                onClick={() => toggleService(gabbaFeatured.id)}
                className={`mt-2 sm:mt-3 rounded-2xl border p-2.5 sm:p-4 w-full text-left transition-all duration-200 ${
                  selectedExtras.includes(gabbaFeatured.id)
                    ? 'border-[rgba(255,77,36,1)] ring-2 ring-[rgba(255,77,36,1)] bg-white'
                    : 'border-gray-200 bg-gray-50 hover:border-[rgba(255,77,36,1)]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
                  <div className="w-16 h-14 sm:w-28 sm:h-20 flex items-center justify-center shrink-0">
                    <img
                      src={gabbaFeatured.image}
                      alt={gabbaFeatured.name}
                      className="max-h-full max-w-full object-contain"
                      width={140}
                      height={90}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[18px] sm:text-[18px] leading-none font-semibold text-[rgba(255,77,36,1)] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                      {gabbaFeatured.priceLabel}
                    </p>
                    {/* <h3 className="text-[18px] sm:text-[24px] leading-tight text-gray-900 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                      {gabbaFeatured.name}
                    </h3> */}
                    <p className="text-xs sm:text-base leading-snug text-gray-700 break-words">{gabbaFeatured.description}</p>
                  </div>
                  {gabbaFeatured.badge && (
                    <span className="inline-flex items-center self-start rounded-full border border-[rgba(255,77,36,1)] text-[rgba(255,77,36,1)] text-xs px-2.5 py-1 sm:ml-auto">
                      {gabbaFeatured.badge}
                    </span>
                  )}
                </div>
              </button>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
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
        )}
      </div>
    </div>
  )
}
