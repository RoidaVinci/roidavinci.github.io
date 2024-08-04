---
layout: default
title: "Final Report of the External Internship at IDIS"
---

# Final Report of the External Internship at IDIS

## Introduction
The Neuroimaging and Biotechnology Laboratory (NOBEL) at the Health Research Institute (IDIS) is located in the Hospital Clínico Universitario de Santiago de Compostela. It conducts neuroimaging analysis tasks aimed at preclinical studies (those carried out in animal models before being transferred to humans). The primary focus in the laboratory involves preclinical tests on rodents, studying the effects of certain inoculated substances over time. The ultimate goal is to extrapolate the results to relevant medical information about humans. Various stations are used, from image acquisition methods like magnetic resonance imaging to a computerized area for analysis and operating tables for rodents.

During my internship, I worked on obtaining brain maps of rodents through software processing of preclinical magnetic resonance imaging (MRI), for the subsequent extraction of relevant data and parameters for precise analysis.

## Magnetic Resonance Imaging
Magnetic resonance imaging (MRI) is an indirect method of obtaining images of objects inaccessible through conventional lenses, such as human or rat organs. Its foundation is purely physical, using a magnetic field and subsequent transverse magnetic fields to obtain precise wave information about each point in space. This allows the reconstruction of two-dimensional images of the interiors of bodies.

Under certain physical assumptions, the application of an external magnetic field to an isolated system containing Hydrogen nuclei causes the spins to predominantly align in the direction of the magnetic field. This creates a net magnetization, \( M \), which is the sum of the magnetic moments of all Hydrogen nuclei in the system, described by the following equations over time:

$$
\begin{cases}
M_x(t)=M_0 e^{-\frac{t}{T_2}} \sin(\omega t), \\
M_y(t)=M_0 e^{-\frac{t}{T_2}} \cos(\omega t), \\
M_z(t)=M_0 (1-e^\frac{-t}{T_1}),
\end{cases}
$$

where \( M_0 \) is the initial value of the net magnetization, greater with a stronger external magnetic field, and \( T_1 \) and \( T_2 \) are parameters dependent on the physico-chemical structure of the sample. The times \( T_1 \) and \( T_2 \) represent the time for the transverse components \( M_x \) and \( M_y \) and the longitudinal component \( M_z \) to return to \( 1-\frac{1}{e} \approx 0.63 \) of their equilibrium values. This process is crucial for subsequent MRI image analysis, as explained later.

<p align="center">
  <img src="../imaxes/mxymz.png" alt="Figure 1" style="max-width: 50%;">
</p>
<p align="center">
  <em>Figure 1: Illustration showing the tendency of net magnetization to return to the longitudinal axis, making the transverse magnetization null over time.</em>
</p>

In practice, the transverse component \( M_x, M_y \) does not return to \( 1-\frac{1}{e} \) of the equilibrium value within \( T_2 \). Local chemical structure differences and magnetic field inhomogeneities cause this process to be faster. Hence, the observed decay time \( T_2^* \) is defined as:

$$
T_2^*=\frac{1}{\frac{1}{T_2}+\gamma\Delta B_0}
$$

where \( \gamma \) is the gyromagnetic ratio and \( \Delta B_0 \) is the magnetic field variation at the measurement point. \( T_2^* \) is the practical decay time of the transverse component to \( \frac{1}{e} \), often more useful and reliable for studies, requiring more uniform magnetic fields due to greater sensitivity to field irregularities.

Relaxation times \( T_1 \) and \( T_2 \), and thus \( T_2^* \), depend on the amount and size of water molecules and hydrophilic molecules (those tending to chemically combine with water). This theoretical and practical relationship is vital for creating images of living specimens.

MRI captures electromagnetic wave information, encapsulating all system data in the K-space, \( \mathbb{K} \):

$$
(k_x,k_y)(t)=\left(\int_{0}^t\gamma G_x(u)du,\int_{0}^t\gamma G_y(u)du\right)\in\mathbb{K},
$$

where \( \gamma \) is the gyromagnetic ratio, and \( G_x \) and \( G_y \) are the magnetic gradients. The K-space contains wave information for MRI data, allowing image reconstruction through inverse Fourier series, using methods like the Fast Fourier Transform. K-space data is often halved using theoretical central symmetry, accelerating reconstruction.

<p align="center">
  <img src="../imaxes/kespacio.png" alt="Figure 2" style="max-width: 50%;">
</p>
<p align="center">
  <em>Figure 2: K-space of an MRI of a human brain and associated image.</em>
</p>

Depending on the type of analysis, we process and normalize the above information into \( T_1 \), \( T_2 \), and \( T_2^* \) maps, where each pixel has a value in the range \( [0,1] \) on a grayscale, more intense for longer \( T_1 \), \( T_2 \), or \( T_2^* \) times.

## Analysis of MRI Images
Depending on the study, chemical properties of the components involved, and the applied magnetic field, one of the aforementioned imaging methods may be more useful. After obtaining the desired map, either \( T_1 \), \( T_2 \), or \( T_2^* \), it must be analyzed to extract clinical information. Depending on the study, a wide range of parameters, cuts, or statistical information, such as the mean or variance of \( T_1 \), \( T_2 \), and \( T_2^* \) within an image or between images at different times, may be of interest. This helps to test hypotheses, such as whether \( T_2 \) remains unchanged after irradiating a rat's brain, thereby ruling out tumors or brain diseases due to radiation.

<p align="center">
  <img src="../imaxes/scan.png" alt="Figure 3" style="max-width: 50%;">
</p>
<p align="center">
  <em>Figure 3: \( T_2^* \) MRI of a rat's brain with 12 slices showing a small lesion in the right frontal area (whiter area).</em>
</p>

It is often useful to crop certain parts of the image to remove irrelevant information, measuring properties of the parts involved in a process. For instance, segmenting a person's brain to isolate an area affected by a hemorrhage, confirming the presence of the hemorrhage as described earlier.

<p align="center">
  <img src="../imaxes/segmentadomanual.png" alt="Figure 4" style="max-width: 50%;">
</p>
<p align="center">
  <em>Figure 4: Manual segmentation of the lesion shown in Figure 3.</em>
</p>

## Activities Performed
My initial days at IDIS were dedicated to familiarizing myself with the processes carried out by an MRI laboratory operator and the theoretical concepts underlying these tasks, from physical principles to programming and mathematics. Given the vast scope of this field and my focus on image segmentation, I specifically concentrated on programming for image processing and segmentation, leaving aside non-essential details and advanced physical theory. I began learning Python, widely reputed in scientific domains, and particularly used in automatic image segmentation. After the first week, I collaborated in processing and analyzing MRIs from a clinical study on the potential influence of radiation on rat brain development. This study was conducted with three control times: before exposure, at 48 hours, and at 30 days. For image processing, semi-automated software is already in use, consisting of a series of plugins based on the ImageJ program, transforming raw format images (2seq) to the desired visual format, in my case, processed images of \( T_2 \) and \( T_2^* \). I then manually analyzed and segmented each image in search of relevant information, such as the formation of tumors or internal hemorrhages.

## Proposed Solution
This problem has had satisfactory solutions for humans for a long time. Solutions for rat and mouse brains are more recent and still far from ideal, but currently provide better results in terms of the Sørensen-Dice coefficient (DICE), indicating overlap between two segmentations \( A,B\subset\mathbb{R}^2 \), defined as:

$$
DICE(A,B):=\frac{2\operatorname{Area}(A\cap B)}{\operatorname{Area(A)+\operatorname{Area}(B)}},
$$

The process of setting up the neural network to analyze the IDIS images was the most challenging part. After configuring it, we found that the network, despite yielding results indicating good performance, required further adjustments to match the actual segmentation needs. I introduced images obtained from other laboratories, and these provided more satisfactory results, as shown in Figure 6.

<p align="center">
  <img src="../imaxes/segmentadoauto.png" alt="Figure 6" style="max-width: 50%;">
</p>
<p align="center">
  <em>Figure 6: Automatic segmentation of the images from Figure 3 performed by the RatLesNetv2 neural network with training data from homogeneous/model-3. See [GitHub/jmlipman/RatLesNetv2](https://github.com/jmlipman/RatLesNetv2#3-training-and-evaluation).</em>
</p>

The conclusion drawn from this was that there was likely a significant difference between the images obtained at IDIS and those obtained at the Charles River laboratory, where the RatLesNetv2 network was trained. This difference could stem from variations in magnetic fields, receivers, or scanner times, as well as the formats and standards used by the laboratory in terms of the number of slices or image resolutions. This necessitates the neural network to be retrained from scratch with images from the NOBEL laboratory and their respective segmentations. Although this process requires hundreds of images and is tremendously time-consuming, it remains a viable solution for the future.
