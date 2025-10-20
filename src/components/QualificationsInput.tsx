import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { X, Plus } from 'lucide-react';

interface Qualification {
  institution: string;
  degree: string;
  year: string;
  field: string;
}

interface QualificationsInputProps {
  qualifications: Qualification[];
  onChange: (qualifications: Qualification[]) => void;
}

export const QualificationsInput: React.FC<QualificationsInputProps> = ({
  qualifications,
  onChange
}) => {
  const [newQualification, setNewQualification] = useState<Qualification>({
    institution: '',
    degree: '',
    year: '',
    field: ''
  });

  const addQualification = () => {
    if (qualifications.length < 5 && newQualification.institution && newQualification.degree) {
      onChange([...qualifications, newQualification]);
      setNewQualification({ institution: '', degree: '', year: '', field: '' });
    }
  };

  const removeQualification = (index: number) => {
    onChange(qualifications.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <Label>Professional Qualifications (up to 5)</Label>
      
      {qualifications.map((qual, index) => (
        <Card key={index} className="relative">
          <CardContent className="p-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => removeQualification(index)}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Institution</Label>
                <p className="text-sm text-gray-700">{qual.institution}</p>
              </div>
              <div>
                <Label className="text-sm">Degree/Certificate</Label>
                <p className="text-sm text-gray-700">{qual.degree}</p>
              </div>
              <div>
                <Label className="text-sm">Year</Label>
                <p className="text-sm text-gray-700">{qual.year}</p>
              </div>
              <div>
                <Label className="text-sm">Field of Study</Label>
                <p className="text-sm text-gray-700">{qual.field}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {qualifications.length < 5 && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="institution">Institution</Label>
                <Input
                  id="institution"
                  value={newQualification.institution}
                  onChange={(e) => setNewQualification({
                    ...newQualification,
                    institution: e.target.value
                  })}
                  placeholder="University/College name"
                />
              </div>
              <div>
                <Label htmlFor="degree">Degree/Certificate</Label>
                <Input
                  id="degree"
                  value={newQualification.degree}
                  onChange={(e) => setNewQualification({
                    ...newQualification,
                    degree: e.target.value
                  })}
                  placeholder="Bachelor's, Master's, etc."
                />
              </div>
              <div>
                <Label htmlFor="year">Year Completed</Label>
                <Input
                  id="year"
                  value={newQualification.year}
                  onChange={(e) => setNewQualification({
                    ...newQualification,
                    year: e.target.value
                  })}
                  placeholder="2020"
                />
              </div>
              <div>
                <Label htmlFor="field">Field of Study</Label>
                <Input
                  id="field"
                  value={newQualification.field}
                  onChange={(e) => setNewQualification({
                    ...newQualification,
                    field: e.target.value
                  })}
                  placeholder="Engineering, Business, etc."
                />
              </div>
            </div>
            <Button
              type="button"
              onClick={addQualification}
              className="mt-4"
              disabled={!newQualification.institution || !newQualification.degree}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Qualification
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};