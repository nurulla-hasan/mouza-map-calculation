import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { DECIMALS } from '@/utils/mapCalculations';

export const ReportTable = memo(({ results }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Unit</TableHead>
          <TableHead>Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>শতক</TableCell>
          <TableCell>{results.shotok.toFixed(DECIMALS)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>কাঠা</TableCell>
          <TableCell>{results.katha.toFixed(DECIMALS)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>বর্গফুট</TableCell>
          <TableCell>{results.sqft.toFixed(DECIMALS)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
});

export const SideLengthsList = memo(({ lengths, decimals = DECIMALS, showPerimeter = true }) => {
  const perimeter = lengths.slice(0, -1).reduce((a, b) => a + b, 0);
  return (
    <>
      <ul className="list-disc list-inside print:hidden">
        {lengths.slice(0, -1).map((len, i) => (
          <li key={i}>বাহু {i + 1}: {len.toFixed(decimals)} ft</li>
        ))}
      </ul>
      {showPerimeter && (
        <p className="mt-2 font-semibold">পরিসীমা: {perimeter.toFixed(decimals)} ft</p>
      )}
    </>
  );
});

export const ResultsDisplay = memo(({ results, onPrint }) => {
  if (!results) return null;

  return (
    <div className="mt-6 bg-muted/50 p-4 rounded-lg border border-border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-foreground">হিসাবের ফলাফল</h3>
        <Button onClick={onPrint} className="print:hidden">রিপোর্ট প্রিন্ট করুন</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>আয়তন (শতকে)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{results.shotok.toFixed(DECIMALS)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>আয়তন (কাঠায়)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{results.katha.toFixed(DECIMALS)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>আয়তন (বর্গফুটে)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{results.sqft.toFixed(DECIMALS)}</p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-4">
        <Label className="mb-2 block">বাহুর দৈর্ঘ্য (ফুটে):</Label>
        <Card>
          <CardContent>
            <SideLengthsList lengths={results.lengths} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
