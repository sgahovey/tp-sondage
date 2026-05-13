import NewPollForm from "./new_poll_form";

export const metadata = { title: "Nouveau sondage" };

export default function NewPollPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Nouveau sondage</h1>
      <p className="mt-1 text-sm text-slate-600">
        Le sondage sera ouvert pendant 30 minutes à partir de sa création.
      </p>
      <div className="mt-8">
        <NewPollForm />
      </div>
    </div>
  );
}
