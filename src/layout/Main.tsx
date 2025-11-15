import { Outlet } from "react-router";
import Header from "../components/ui/Header";
import Footer from "../components/ui/Footer";

export default function Main() {
  return (
    <div className="w-full flex flex-col items-center mt-[84px] bg-white">
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
}
