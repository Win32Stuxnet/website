/* eslint-disable no-underscore-dangle */ // We use this because we have the _unit property
/* eslint-disable sonarjs/no-duplicate-string */

import { useRouter } from "next/router";

import React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Drug } from "tripsit_drug_db";

import Header from "../../components/Header";
import Head from "../../components/Head";

import DrugInfoCard from "../../components/DrugInfo";

function DrugNotFound() {
  return (
    <>
      <h1>Drug not found</h1>
      <p>
        The drug you&apos;re looking for doesn&apos;t exist in the database. If
        you think this is an error, please{" "}
        <a href="https://discord.gg/tripsit">contact us on Discord</a>.
      </p>
    </>
  );
}

export default function DrugInfo() {
  const {
    data: { data = [] } = {},
  } = useQuery<{
    data: Array<Drug>;
  }>({
    queryKey: ["table-data"],
    queryFn: async () => {
      const response = await fetch(
        // TripSit's drug database file, fetched on each page load for latest data
        "https://raw.githubusercontent.com/TripSit/drugs/main/drugs.json",
      );
      const drugList = Object.values(
        (await response.json()) as { [key: string]: Drug },
      );
      return {
        data: drugList,
      };
    },
    placeholderData: keepPreviousData,
  });

  const router = useRouter();
  const drugName = router.query.drug;

  if (!drugName || Array.isArray(drugName)) {
    return <DrugNotFound />;
  }

  const drugData = data.find(
    (drug) =>
      drug.name.toLowerCase() === drugName.toLowerCase() ||
      drug.pretty_name.toLowerCase() === drugName.toLowerCase() ||
      drug.aliases?.includes(drugName.toLowerCase()),
  );

  if (!drugData) {
    return <DrugNotFound />;
  }

  return (
    <>
      <Header />
      <Head />
      <section id="drugInfo">
        <DrugInfoCard drugData={drugData} />
      </section>
    </>
  );
}
