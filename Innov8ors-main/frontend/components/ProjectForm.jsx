import { useState } from "react";
import api from "../services/api";

const initialForm = {
  employer_id: "",
  freelancer_id: "",
  title: "",
  description: "",
  budget: "",
  deadline: ""
};

export default function ProjectForm({ onSubmit, loading }) {

  const [form, setForm] = useState(initialForm);

  const [milestones, setMilestones] = useState("");

  const [aiLoading, setAiLoading] = useState(false);

  const handleChange = (event) => {

    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));

  };

  const handleSubmit = (event) => {

    event.preventDefault();

    onSubmit({
      ...form,
      budget: Number(form.budget),
      milestones
    });

  };

  // ⭐ AI REQUIREMENT ANALYZER
  const generateMilestones = async () => {

    if (!form.description) {
      alert("Please enter project description first");
      return;
    }

    try {

      setAiLoading(true);

      const res = await api.post("/generate-milestones", {
        description: form.description
      });

      setMilestones(res.data.milestones);

    } catch (error) {

      console.error(error);
      alert("AI generation failed");

    } finally {

      setAiLoading(false);

    }

  };

  // ⭐ ESCROW PAYMENT
  const depositBudget = async () => {

    if (!form.budget) {
      alert("Enter project budget first");
      return;
    }

    try {

      const res = await api.post("/create-payment", {
        amount: form.budget
      });

      const order = res.data;

      const options = {

        key: "rzp_test_YOUR_KEY",

        amount: order.amount,

        currency: "INR",

        name: "AI Escrow Agent",

        description: "Project Budget Deposit",

        order_id: order.id,

        handler: function (response) {

          alert("Payment successful!");

          console.log(response);

        }

      };

      const rzp = new window.Razorpay(options);

      rzp.open();

    } catch (error) {

      console.log(error);

      alert("Payment failed");

    }

  };

  return (

    <form className="card space-y-4" onSubmit={handleSubmit}>

      <h2 className="text-xl font-semibold">Create Project</h2>

      {/* Employer ID */}

      <input
        className="input"
        name="employer_id"
        value={form.employer_id}
        onChange={handleChange}
        placeholder="Employer ID"
        required
      />

      {/* Freelancer ID */}

      <input
        className="input"
        name="freelancer_id"
        value={form.freelancer_id}
        onChange={handleChange}
        placeholder="Freelancer ID (optional)"
      />

      {/* Title */}

      <input
        className="input"
        name="title"
        value={form.title}
        onChange={handleChange}
        placeholder="Project Title"
        required
      />

      {/* Description */}

      <textarea
        className="input min-h-28"
        name="description"
        value={form.description}
        onChange={handleChange}
        placeholder="Describe your project"
        required
      />

      {/* ⭐ AI BUTTON */}

      <button
        type="button"
        onClick={generateMilestones}
        className="btn-secondary"
      >

        {aiLoading
          ? "Generating AI milestones..."
          : "Generate Milestones (AI)"}

      </button>

      {/* AI OUTPUT */}

      {milestones && (

        <pre className="bg-black text-white p-4 rounded">

          {milestones}

        </pre>

      )}

      {/* Budget */}

      <input
        type="number"
        className="input"
        name="budget"
        value={form.budget}
        onChange={handleChange}
        placeholder="Project Budget"
        required
      />

      {/* Deadline */}

      <input
        type="date"
        className="input"
        name="deadline"
        value={form.deadline}
        onChange={handleChange}
        required
      />

      {/* ⭐ Deposit */}

      <button
        type="button"
        onClick={depositBudget}
        className="btn-primary"
      >

        Deposit Budget

      </button>

      {/* Create */}

      <button
        className="btn-primary"
        type="submit"
        disabled={loading}
      >

        {loading ? "Creating..." : "Create Project"}

      </button>

    </form>

  );

}