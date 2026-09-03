import { motion } from 'motion/react'
import { MapPin, Clock, Phone } from 'lucide-react'

/**
 * @param {{
 *   service: any,
 *   selected?: boolean,
 *   onSelect?: () => void,
 *   imageWidth?: number,
 *   imageHeight?: number,
 *   containerHeight?: string,
 *   variant?: string,
 *   index?: number,
 * }} props
 */
export default function ServiceCard({
    service,
    selected,
    onSelect,
    imageWidth = 200,
    imageHeight = 200,
    containerHeight = 'aspect-[4/3]',
    variant = 'default',
    index = 0,
    imagePosition = 'top',
}) {
    // Handle both string and object formats
    const serviceName = typeof service === 'string' ? service : service?.name
    const serviceImage = typeof service === 'object' ? service?.image : null
    const servicePrice = typeof service === 'object' ? service?.price : null
    const serviceInitials = typeof service === 'object' ? service?.initials : null
    const serviceRating = typeof service === 'object' ? service?.rating : null
    const serviceAddress = typeof service === 'object' ? service?.address : null
    const serviceMapUrl = typeof service === 'object' ? service?.mapUrl : null
    const serviceTime = typeof service === 'object' ? service?.time : null
    const servicePhone = typeof service === 'object' ? service?.phone : null
    const isCompact = variant === 'compact'
    const isWorkshop = variant === 'workshop'
    const isService = variant === 'service'

    // Tap-to-call and map links for workshop cards. Building them here keeps the
    // display text (e.g. "(07) 3607 0215") separate from the dial string.
    const telHref = servicePhone ? `tel:${String(servicePhone).replace(/[^\d+]/g, '').replace(/^0/, '+61')}` : null
    // Prefer an explicit business listing URL so the address opens the actual
    // Car One place on Google Maps, not just a pin on the street address.
    const mapHref = serviceMapUrl || (serviceAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(serviceAddress)}` : null)
    /** A tap on the phone/address link must not also select the card. */
    const stopCardClick = (/** @type {any} */ e) => e.stopPropagation()

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.06, ease: 'easeOut' }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="h-full"
            style={{ willChange: 'transform, opacity' }}
        >
        <div
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            onClick={onSelect}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect && onSelect() } }}
            className={`cursor-pointer text-left w-full min-w-0 rounded-xl overflow-hidden transition border-2 h-full flex flex-col card-border ${isCompact ? 'p-2' : 'p-2'} ${selected
                ? isCompact
                    ? 'border-[rgba(255,77,36,1)] ring-2 ring-[rgba(255,77,36,1)] bg-white'
                    : 'border-[rgba(255,77,36,1)] ring-2 ring-[rgba(255,77,36,1)] bg-[rgba(255,77,36,0.08)]'
                : isCompact
                    ? 'border-gray-200 hover:border-[rgba(255,77,36,1)] bg-white'
                    : 'border-gray-200 hover:border-[rgba(255,77,36,1)]'
                }`}
            style={{ borderColor: selected ? 'var(--color-primary)' : '#e5e7eb' }}
        >
            {(serviceImage || isCompact) && (
                <div
                  className={`relative overflow-hidden w-full ${isCompact ? `${containerHeight} bg-gray-50 rounded-lg flex items-center justify-center` : isWorkshop ? 'rounded-lg flex-shrink-0 bg-white w-full aspect-[2/1]' : isService ? `bg-white rounded-lg ${containerHeight}` : `bg-gray-200 rounded-lg ${containerHeight}`} `}
                  style={isWorkshop ? { width: '100%' } : {}}
                >
                    {serviceImage ? (
                        <img
                            src={serviceImage}
                            alt={serviceName}
                            className={
                              isCompact
                                ? 'w-16 h-16 sm:w-28 sm:h-28 object-contain'
                                : isService
                                  ? 'w-full h-full object-contain object-center rounded-lg p-2'
                                  : isWorkshop
                                                                        ? 'w-full h-full object-cover object-top rounded-lg'
                                    : 'w-full h-full object-cover rounded-lg'
                            }
                                                        style={isWorkshop ? { width: '100%', height: '100%', display: 'block' } : {}}
                            width={imageWidth}
                            height={imageHeight}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <span className="h-11 w-11 rounded-full bg-slate-200 text-slate-700 font-semibold text-sm flex items-center justify-center">
                                {serviceInitials || (serviceName ? serviceName.split(' ').map((/** @type {string} */ part) => part[0]).join('').slice(0, 2).toUpperCase() : 'SR')}
                            </span>
                        </div>
                    )}
                    {service?.badge && (
                        <span
                          className={`absolute top-3 right-3 inline-flex items-center justify-center rounded-[20px] font-display text-[10px] leading-[14px] px-2 py-0.5 ${isCompact ? 'bg-[#FFF4EB] text-[#FF4D24]' : 'bg-[#FF4D24] text-white'}`}
                          style={{ border: '0.6px solid #FF4D24' }}
                        >
                            {service.badge}
                        </span>
                    )}
                </div>
            )}
                                                <div className={`${isCompact ? 'p-2.5' : isWorkshop ? 'p-2.5 sm:p-3.5' : 'p-2.5 sm:p-3'} flex-1 flex flex-col min-w-0`}>
                <div className={`flex ${isCompact ? 'flex-col items-center text-center gap-1.5' : 'items-center justify-between'}`}>
                    {servicePrice && (
                        <span className={`text-[rgba(255,77,36,1)] font-semibold ${isCompact ? 'text-[18px] sm:text-[18px]' : 'text-sm sm:text-lg'} leading-none`}>{servicePrice}</span>
                    )}
                                                                                <h3 className={`${isCompact ? 'text-[18px] sm:text-[18px] leading-[1.2]' : isWorkshop ? 'text-[16px] sm:text-[22px] md:text-[24px] leading-[1.25] tracking-[-0.01em]' : 'text-[18px] sm:text-[20px] md:text-[16px] leading-[1.375] tracking-[-0.01em]'} font-medium break-words`} style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary-dark)' }}>
                        {serviceName}
                    </h3>
                    {!isCompact && serviceRating && <span className="text-xs sm:text-sm"> ⭐ {serviceRating}</span>}
                </div>
                                                                {!isCompact && serviceAddress && (
                  isWorkshop && mapHref ? (
                    <a
                      href={mapHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={stopCardClick}
                      className="flex items-start gap-1.5 text-[13px] sm:text-base leading-[1.45] line-clamp-1 mt-1 font-display mb-1 break-words text-[#111] hover:text-[rgba(255,77,36,1)] hover:underline"
                    >
                      <MapPin size={18} className="text-[rgba(255,77,36,1)] shrink-0 mt-0.5" />
                      {serviceAddress}
                    </a>
                  ) : (
                    <p
                      className={`${isWorkshop ? 'flex items-start gap-1.5 text-[13px] sm:text-base leading-[1.45] line-clamp-1 mt-1 font-display text-[#111]' : 'flex items-start gap-1.5 text-xs sm:text-sm line-clamp-2 text-gray-600'} mb-1 break-words`}
                    >
                      <MapPin size={18} className="text-[rgba(255,77,36,1)] shrink-0 mt-0.5" />
                      {serviceAddress}
                    </p>
                  )
                )}
                {!isCompact && serviceTime && (
                                                                    <p
                                                                        className={`${isWorkshop ? 'hidden sm:flex items-center gap-1.5 text-[13px] sm:text-base leading-[1.45] font-display text-[#111]' : 'flex items-center gap-1.5 text-xs sm:text-sm text-gray-600'} mb-1`}
                                                                    >
                    <Clock size={18} className="text-[rgba(255,77,36,1)] shrink-0" />
                    {serviceTime}
                  </p>
                )}
                {!isCompact && servicePhone && (
                  isWorkshop && telHref ? (
                    <a
                      href={telHref}
                      onClick={stopCardClick}
                      className="flex items-center gap-1.5 text-[13px] sm:text-base leading-[1.45] font-display text-[#111] hover:text-[rgba(255,77,36,1)] hover:underline"
                    >
                      <Phone size={18} className="text-[rgba(255,77,36,1)] shrink-0" />
                      {servicePhone}
                    </a>
                  ) : (
                    <p
                      className={`${isWorkshop ? 'flex items-center gap-1.5 text-[13px] sm:text-base leading-[1.45] font-display text-[#111]' : 'flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-600'}`}
                    >
                      <Phone size={18} className="text-[rgba(255,77,36,1)] shrink-0" />
                      {servicePhone}
                    </p>
                  )
                )}
            </div>
        </div>
        </motion.div>
    )
}
