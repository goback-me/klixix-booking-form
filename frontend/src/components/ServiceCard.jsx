import { motion } from 'motion/react'

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
        >
        <button
            onClick={onSelect}
            className={`text-left w-full min-w-0 rounded-xl overflow-hidden transition border-2 h-full flex flex-col card-border ${isCompact ? 'p-2' : 'p-2'} ${selected
                ? isCompact
                    ? 'border-sky-500 ring-2 ring-sky-500 bg-white'
                    : 'border-orange-500 ring-2 ring-orange-500 bg-orange-50'
                : isCompact
                    ? 'border-gray-200 hover:border-sky-300 bg-white'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
            style={{ borderColor: selected ? (isCompact ? '#1d9bf0' : 'var(--color-primary)') : '#e5e7eb' }}
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
            <div className={`${isCompact ? 'p-2.5' : 'p-3 md:p-4'} flex-1 flex flex-col min-w-0`}>
                <div className={`flex ${isCompact ? 'flex-col items-center text-center gap-1.5' : 'items-center justify-between'}`}>
                    {servicePrice && (
                        <span className="text-orange-500 font-semibold text-lg leading-none">{servicePrice}</span>
                    )}
                    <h3 className={`${isCompact ? 'text-sm leading-5' : 'text-lg md:text-xl'} font-600 break-words`} style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary-dark)' }}>
                        {serviceName}
                    </h3>
                    {!isCompact && serviceRating && <span> ⭐ {serviceRating}</span>}
                </div>
                {!isCompact && serviceAddress && <p className="text-sm md:text-sm mb-1 break-words line-clamp-2">{serviceAddress}</p>}
                {!isCompact && serviceTime && <p className="text-sm mb-2">{serviceTime}</p>}
                {!isCompact && servicePhone && <p className="text-sm md:text-sm font-500">{servicePhone}</p>}
            </div>
        </button>
        </motion.div>
    )
}
