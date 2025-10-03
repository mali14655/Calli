import { useState, useEffect, Fragment } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Dialog, Transition } from "@headlessui/react";
import toast, { Toaster } from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function BookingApp() {
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // Modals
  const [showAddService, setShowAddService] = useState(false);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [showBookSlot, setShowBookSlot] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Dynamic schedule windows
  const [scheduleWindows, setScheduleWindows] = useState([
    { start: "", end: "", note: "working hours" },
  ]);

  // Normalize
  const normalizeService = (s) => ({
    _id: s._id?.$oid || s._id || s.id,
    name: s.name,
    duration: Number(s.duration?.$numberInt || s.duration || 0),
    price: Number(s.price?.$numberInt || s.price || 0),
  });

  const normalizeBooking = (b) => ({
    _id: b._id?.$oid || b._id,
    serviceId: b.serviceId,
    serviceName: b.serviceName || b.service?.name || "Unknown",
    start: b.start,
    end: b.end,
    clientName: b.clientName,
    clientPhone: b.clientPhone,
  });

  // Fetch services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch(`${API_BASE}/services`);
        const data = await res.json();
        if (data.ok && Array.isArray(data.items)) {
          setServices(data.items.map(normalizeService));
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch services");
      }
    };
    fetchServices();
  }, []);

  // Fetch bookings
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch(`${API_BASE}/bookings/today`);
        const data = await res.json();
        if (data.ok && Array.isArray(data.items)) {
          setBookings(data.items.map(normalizeBooking));
        } else setBookings([]);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch bookings");
      }
    };
    fetchBookings();
  }, []);

  // Add service
  const addService = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const body = {
      name: form.get("name"),
      duration: Number(form.get("duration")),
      price: Number(form.get("price")),
    };
    try {
      const res = await fetch(`${API_BASE}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok && (data.item || data.service)) {
        const newService = data.item || data.service;
        setServices([...services, normalizeService(newService)]);
        setShowAddService(false);
        e.target.reset();
        toast.success("Service added successfully");
      } else {
        toast.error("Failed to add service");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error adding service");
    }
  };

  // Helper: get weekday from date
  const getWeekday = (dateStr) => {
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const d = new Date(dateStr + "T00:00:00");
    return days[d.getDay()]; // returns lowercase weekday like 'monday'
  };

  // Add schedule
  const addSchedule = async () => {
    if (!selectedDate) return toast.error("Select a date first");

    const windows = scheduleWindows.filter((w) => w.start && w.end);
    if (!windows.length) return toast.error("Add at least one time window");

    const day = getWeekday(selectedDate); // <-- compute weekday from selectedDate

    try {
      const res = await fetch(`${API_BASE}/schedules/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, day, windows }), // <-- include 'day'
      });

      const data = await res.json();
      if (data.ok) {
        toast.success("Schedule added!");
        setShowAddSchedule(false);
        setScheduleWindows([{ start: "", end: "", note: "working hours" }]);
      } else {
        toast.error(data.error || "Failed to add schedule");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error adding schedule");
    }
  };

  // Check slots
  const checkSlots = async () => {
    if (!selectedDate || !selectedService)
      return toast.error("Pick service + date");
    try {
      const res = await fetch(
        `${API_BASE}/slots?date=${selectedDate}&serviceId=${selectedService}`
      );
      const data = await res.json();
      if (data.ok && Array.isArray(data.slots)) setSlots(data.slots);
      else setSlots([]);
    } catch (err) {
      console.error(err);
      toast.error("Error fetching slots");
      setSlots([]);
    }
  };

const bookSlot = async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const clientName = form.get("clientName");
  const clientPhone = form.get("clientPhone");
  if (!clientName || !clientPhone) return toast.error("Name & phone required");

  // normalize time
  const padTime = (t) => t.split(":").map(x => x.padStart(2, "0")).join(":");

  const body = {
    serviceId: selectedService,
    date: selectedDate,
    start: padTime(selectedSlot.start), // ensure HH:MM
    clientName,
    clientPhone,
  };

  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) {
      setBookings([...bookings, normalizeBooking(data.booking)]);
      setShowBookSlot(false);
      toast.success("Booked successfully!");
    } else {
      toast.error(data.error || "Booking failed");
    }
  } catch (err) {
    console.error(err);
    toast.error("Error booking slot");
  }
};

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <Toaster position="top-right" />
      <h1 className="text-3xl font-bold text-center mb-8">Calli</h1>

      {/* Buttons */}
      <div className="flex justify-center space-x-4 mb-8">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded"
          onClick={() => setShowAddService(true)}
        >
          Add Service
        </button>
        <button
          className="px-4 py-2 bg-green-500 text-white rounded"
          onClick={() => setShowAddSchedule(true)}
        >
          Add Schedule
        </button>
      </div>

      {/* Book Slot Section */}
      <div className="p-4 border rounded-xl shadow space-y-4">
        <h2 className="text-xl font-bold">Book Slot</h2>
        <select
          className="border p-2 w-full"
          onChange={(e) => setSelectedService(e.target.value)}
          value={selectedService}
        >
          <option value="">Select Service</option>
          {services.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name} ({s.duration} min)
            </option>
          ))}
        </select>

        <DayPicker
          mode="single"
          selected={selectedDate ? new Date(selectedDate) : undefined}
          onSelect={(d) => {
            if (!d) return;
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            setSelectedDate(`${year}-${month}-${day}`);
          }}
        />

        <button
          onClick={checkSlots}
          className="mt-2 px-4 py-2 bg-purple-500 text-white rounded"
        >
          Check Slots
        </button>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {slots.length === 0 && <p>No slots available</p>}
          {slots.map((slot, i) => (
            <div
              key={i}
              className="border p-3 rounded shadow flex justify-between items-center"
            >
              <span>
                {slot.start} - {slot.end}
              </span>
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded"
                onClick={() => {
                  setSelectedSlot(slot);
                  setShowBookSlot(true);
                }}
              >
                Book
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bookings */}
      <div className="p-4 border rounded-xl shadow space-y-4">
        <h2 className="text-xl font-bold">Today's Bookings</h2>
        {bookings.length === 0 && <p>No bookings today</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookings.map((b) => (
            <div key={b._id} className="border p-4 rounded shadow bg-gray-50">
              <div className="font-semibold">{b.serviceName}</div>
              <div>
                {b.start ?? "?"} - {b.end ?? "?"}
              </div>
              <div>
                {b.clientName ?? "Unknown"} ({b.clientPhone ?? "?"})
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Modal */}
      <Transition appear show={showAddSchedule} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setShowAddSchedule(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded shadow space-y-4">
                  <Dialog.Title className="text-lg font-bold">
                    Add Schedule
                  </Dialog.Title>
                  <DayPicker
                    mode="single"
                    selected={selectedDate ? new Date(selectedDate) : undefined}
                    onSelect={(d) => {
                      if (!d) return;
                      const year = d.getFullYear();
                      const month = String(d.getMonth() + 1).padStart(2, "0");
                      const day = String(d.getDate()).padStart(2, "0");
                      setSelectedDate(`${year}-${month}-${day}`);
                    }}
                  />
                  {scheduleWindows.map((w, i) => (
                    <div key={i} className="flex space-x-2">
                      <input
                        type="time"
                        value={w.start}
                        onChange={(e) => {
                          const newWindows = [...scheduleWindows];
                          newWindows[i].start = e.target.value;
                          setScheduleWindows(newWindows);
                        }}
                        className="border p-2 w-1/3"
                      />
                      <input
                        type="time"
                        value={w.end}
                        onChange={(e) => {
                          const newWindows = [...scheduleWindows];
                          newWindows[i].end = e.target.value;
                          setScheduleWindows(newWindows);
                        }}
                        className="border p-2 w-1/3"
                      />
                      <select
                        value={w.note}
                        onChange={(e) => {
                          const newWindows = [...scheduleWindows];
                          newWindows[i].note = e.target.value;
                          setScheduleWindows(newWindows);
                        }}
                        className="border p-2 w-1/3"
                      >
                        <option value="working hours">Working Hours</option>
                        <option value="break">Break</option>
                      </select>
                      {scheduleWindows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setScheduleWindows(
                              scheduleWindows.filter((_, idx) => idx !== i)
                            );
                          }}
                          className="px-2 bg-red-500 text-white rounded"
                        >
                          X
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setScheduleWindows([
                        ...scheduleWindows,
                        { start: "", end: "", note: "working hours" },
                      ])
                    }
                    className="px-4 py-2 bg-gray-300 rounded"
                  >
                    Add Window
                  </button>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-300 rounded"
                      onClick={() => setShowAddSchedule(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-green-500 text-white rounded"
                      onClick={addSchedule}
                    >
                      Save
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Add Service Modal */}
      <Transition appear show={showAddService} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setShowAddService(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded shadow space-y-4">
                  <Dialog.Title className="text-lg font-bold">
                    Add Service
                  </Dialog.Title>
                  <form onSubmit={addService} className="space-y-4">
                    <input
                      name="name"
                      type="text"
                      placeholder="Service Name"
                      required
                      className="border p-2 w-full"
                    />
                    <input
                      name="duration"
                      type="number"
                      placeholder="Duration (minutes)"
                      required
                      className="border p-2 w-full"
                    />
                    <input
                      name="price"
                      type="number"
                      placeholder="Price"
                      required
                      className="border p-2 w-full"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        className="px-4 py-2 bg-gray-300 rounded"
                        onClick={() => setShowAddService(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-500 text-white rounded"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Book Slot Modal */}
      <Transition appear show={showBookSlot} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setShowBookSlot(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded shadow space-y-4">
                  <Dialog.Title className="text-lg font-bold">
                    Book Slot
                  </Dialog.Title>
                  <form onSubmit={bookSlot} className="space-y-4">
                    <div>
                      <label className="block font-semibold">Service</label>
                      <div>
                        {services.find((s) => s._id === selectedService)
                          ?.name || "Unknown"}
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold">Date & Time</label>
                      <div>
                        {selectedDate} | {selectedSlot?.start} -{" "}
                        {selectedSlot?.end}
                      </div>
                    </div>
                    <input
                      name="clientName"
                      type="text"
                      placeholder="Client Name"
                      required
                      className="border p-2 w-full"
                    />
                    <input
                      name="clientPhone"
                      type="text"
                      placeholder="Client Phone"
                      required
                      className="border p-2 w-full"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        className="px-4 py-2 bg-gray-300 rounded"
                        onClick={() => setShowBookSlot(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-500 text-white rounded"
                      >
                        Book
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
