import BookingForm from "./components/BookingForm"
import Header from "./components/Header"

export default function App() {
  return (
    <div className="app-shell flex flex-col bg-white overflow-hidden">
      <Header/>
      <div className="flex-1 overflow-hidden min-h-0 min-w-0">
        <BookingForm />
      </div>
    </div>
  )
}