import { motion } from 'motion/react'
import { MapPin, Clock, Phone } from 'lucide-react'

export default function ServiceCard({
    service,
    selected,
    onSelect,
    imageWidth = 200,
    imageHeight = 200,
    containerHeight = 'aspect-[4/3]',
    variant = 'default',
    index = 0,
}) {
    // Handle both string and object formats
    const serviceName = typeof service === 'string' ? service : service?.name
    const serviceImage = typeof service === 'object' ? service?.image : null
    const servicePrice = typeof service === 'object' ? service?.price : null
    const serviceInitials = typeof service === 'object' ? service?.initials : null
    const serviceRating = typeof service === 'object' ? service?.rating : null
    const serviceAddress = typeof service === 'object' ? service?.address : null
    const serviceTime = typeof service === 'object' ? service?.time : null
    const servicePhone = typeof service === 'object' ? service?.phone : null
    const isCompact = variant === 'compact'

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
        <button
            onClick={onSelect}
            className={`text-left w-full min-w-0 rounded-xl overflow-hidden transition border-2 h-full flex flex-col card-border ${isCompact ? 'p-2' : 'p-2'} ${selected
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
                <div className={`relative overflow-hidden w-full ${isCompact ? `${containerHeight} bg-gray-50 rounded-lg flex items-center justify-center` : `bg-gray-200 rounded-lg ${containerHeight}`} flex-shrink-0`}>
                    {serviceImage ? (
                        <img
                            src={serviceImage}
                            alt={serviceName}
                            className={isCompact ? 'w-14 h-14 object-contain' : 'w-full h-full object-cover rounded-lg'}
                            width={imageWidth}
                            height={imageHeight}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <span className="h-11 w-11 rounded-full bg-slate-200 text-slate-700 font-semibold text-sm flex items-center justify-center">
                                {serviceInitials || (serviceName ? serviceName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() : 'SR')}
                            </span>
                        </div>
                    )}
                </div>
            )}
            <div className={`${isCompact ? 'p-2.5' : 'p-2 sm:p-3 md:p-4'} flex-1 flex flex-col min-w-0`}>
                <div className={`flex ${isCompact ? 'flex-col items-center text-center gap-1.5' : 'items-center justify-between'}`}>
                    {servicePrice && (
                        <span className="text-[rgba(255,77,36,1)] font-semibold text-sm sm:text-lg leading-none">{servicePrice}</span>
                    )}
                    <h3 className={`${isCompact ? 'text-sm leading-5' : 'text-sm sm:text-base md:text-lg'} font-600 break-words`} style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary-dark)' }}>
                        {serviceName}
                    </h3>
                    {!isCompact && serviceRating && <span className="text-xs sm:text-sm"> ⭐ {serviceRating}</span>}
                </div>
                {!isCompact && serviceAddress && (
                  <p className="flex items-start gap-1.5 text-xs sm:text-sm mb-0.5 sm:mb-1 break-words line-clamp-2 text-gray-600">
                    <MapPin size={14} className="text-[rgba(255,77,36,1)] shrink-0 mt-0.5" />
                    {serviceAddress}
                  </p>
                )}
                {!isCompact && serviceTime && (
                  <p className="flex items-center gap-1.5 text-xs sm:text-sm mb-0.5 sm:mb-1 text-gray-600">
                    <Clock size={14} className="text-[rgba(255,77,36,1)] shrink-0" />
                    {serviceTime}
                  </p>
                )}
                {!isCompact && servicePhone && (
                  <p className="flex items-center gap-1.5 text-xs sm:text-sm font-500 text-gray-600">
                    <Phone size={14} className="text-[rgba(255,77,36,1)] shrink-0" />
                    {servicePhone}
                  </p>
                )}
            </div>
        </button>
        </motion.div>
    )
}
