import Logo from "../assets/logo.svg"
import Cross from "../assets/cross.svg"

export default function Header() {
  const handleClose = () => {
    if (window.parent !== window) {
      window.parent.postMessage('carone-booking-close', '*')
    }
  }

  return (
    <header className="bg-primary-dark text-white px-3 sm:px-6 md:px-8 py-2 sm:py-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div>
          <img src={Logo} alt="Logo" width="120" height="28" className="sm:w-[160px] sm:h-[36px] md:w-[180px] md:h-[40px]" />
        </div>
        <div>
          <nav className="flex items-center gap-2 bg-white p-1.5 sm:p-2 rounded-lg">
            <img src={Cross} alt="Close" width="20" height="20" className="sm:w-[24px] sm:h-[24px] cursor-pointer" onClick={handleClose} />
          </nav>
        </div>
      </div>
    </header>
  )
}